// Tara feed probe on Cloudflare's free plan. Step 1 of the always-on engine plan.
//
// Three questions, answered before any engine work:
//   1. Which market-data feeds answer from Cloudflare's servers?
//   2. Can a free Durable Object run Tara's real scoring engine on every tick?
//      Cloudflare's docs disagree on the free CPU cap (10 ms vs 30 s); the
//      CpuTest object runs the engine in batches of 1 to 50 and counts which
//      batches finish.
//   3. Does a 24/7 object with trade streams stay inside the free daily limits?
//
// Read-only. No orders, no exchange credentials, no Discord. Every 5 minutes
// FeedProbe upserts research/feedProbe_cloudflare_v1 in the shared tara_state
// table so results can be read without anyone's browser.
import {DurableObject} from 'cloudflare:workers';
import {computeV99Posterior} from './engine.generated.js';
import {scoringInputs} from './inputs.js';
import {REST, WS, activeStreams} from './feeds.js';

const VERSION = 'feed-probe-cf-v1';
const DOC_PATH = 'research/feedProbe_cloudflare_v1';
const TICK_MS = 5000, PUBLISH_MS = 5 * 60 * 1000, STALL_MS = 60000;
const CPU_BATCHES = [1, 5, 10, 25, 50];
const CPU_EVERY_MS = 5 * 60 * 1000;
const count = (obj, key) => { obj[key] = (obj[key] || 0) + 1; };
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
const percentile = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const runEngine = (times) => {
  for (let i = 0; i < times; i++) computeV99Posterior(scoringInputs({secondsLeft: 600 - (i % 400), direction: i % 2 ? 'UP' : 'DOWN'}));
};

export class FeedProbe extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.started = Date.now();
    this.rest = new Map();
    this.ws = new Map();
    this.sockets = new Map();
    this.nextDue = {};
    this.engine = {ticks: 0, errors: 0, lastError: null};
    this.lastPublish = 0;
    this.trace = null;
    ctx.blockConcurrencyWhile(async () => {
      this.boots = ((await ctx.storage.get('boots')) || 0) + 1;
      this.firstStartedAt = (await ctx.storage.get('firstStartedAt')) || this.started;
      await ctx.storage.put({boots: this.boots, firstStartedAt: this.firstStartedAt});
    });
  }

  async fetch(request) {
    try {
      const path = new URL(request.url).pathname;
      if (path === '/ensure') { await this.ensureAlarm(); return new Response('ok'); }
      if (path === '/summary') return Response.json(this.summary());
      return new Response('not found', {status: 404});
    } catch (e) {
      return Response.json({error: String(e?.stack || e).slice(0, 800)}, {status: 500});
    }
  }

  async ensureAlarm() {
    const at = await this.ctx.storage.getAlarm();
    if (!at || at < Date.now() - 30000) await this.ctx.storage.setAlarm(Date.now() + 1000);
  }

  async alarm() {
    const now = Date.now();
    const connecting = this.manageSockets(now);
    const due = REST.filter(([name]) => (this.nextDue[name] ?? 0) <= now);
    for (const r of due) this.nextDue[r[0]] = now + r[2];
    await Promise.all([...due.map((r) => this.runRest(r)), ...connecting]);
    // The per-tick engine run, as the real engine would do every evaluation.
    try { runEngine(1); this.engine.ticks++; } catch (e) { this.engine.errors++; this.engine.lastError = String(e?.message || e).slice(0, 160); }
    if (!this.trace || now - this.trace.at > 3600000) await this.refreshTrace();
    if (now - this.lastPublish >= PUBLISH_MS && now - this.started > 60000) { this.lastPublish = now; await this.publish(); }
    await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
  }

  // ---------- REST ----------
  stat(name, role) {
    if (!this.rest.has(name)) this.rest.set(name, {role, attempts: 0, ok: 0, fail: 0, statuses: {}, errors: {}, lat: [],
      lastOkAt: null, lastError: null, failStreak: 0, maxFailStreak: 0, outageStart: null, longestOutageMs: 0});
    return this.rest.get(name);
  }

  async runRest([name, role, , url, check]) {
    const s = this.stat(name, role);
    s.attempts++;
    const t0 = Date.now();
    let status = 'none', error = null;
    try {
      const res = await fetch(typeof url === 'function' ? url() : url, {
        headers: {Accept: 'application/json', 'User-Agent': 'TaraFeedProbe/1 (+https://taracalls.pages.dev)'}, signal: AbortSignal.timeout(10000)});
      status = String(res.status);
      const text = await res.text();
      if (!res.ok) error = `http-${res.status}`;
      else {
        let body;
        try { body = JSON.parse(text); } catch { error = text.trimStart().startsWith('<') ? 'html-body' : 'bad-json'; }
        if (!error && !check(body)) error = 'unexpected-shape';
      }
    } catch (e) {
      error = e?.name === 'TimeoutError' ? 'timeout' : (e?.name || 'network');
    }
    const at = Date.now();
    count(s.statuses, status);
    if (!error) {
      s.ok++; s.lastOkAt = at; s.lat.push(at - t0); if (s.lat.length > 400) s.lat.shift();
      if (s.outageStart) { s.longestOutageMs = Math.max(s.longestOutageMs, at - s.outageStart); s.outageStart = null; }
      s.failStreak = 0;
    } else {
      s.fail++; s.lastError = error; count(s.errors, error);
      s.failStreak++; s.maxFailStreak = Math.max(s.maxFailStreak, s.failStreak);
      if (!s.outageStart) s.outageStart = at;
    }
  }

  // ---------- trade streams ----------
  wsStat(name) {
    if (!this.ws.has(name)) this.ws.set(name, {role: WS[name].role, scheduledMs: 0, openMs: 0, connects: 0, opens: 0,
      handshake: {}, closes: {}, errors: 0, messages: 0, trades: 0, stalls: 0, longestGapS: 0, lastError: null, retryAt: 0, backoff: 2000});
    return this.ws.get(name);
  }

  manageSockets(now) {
    const want = new Set(activeStreams(now)), connecting = [];
    for (const name of Object.keys(WS)) {
      const s = this.wsStat(name), sock = this.sockets.get(name);
      if (want.has(name)) {
        s.scheduledMs += s.lastSeenAt ? now - s.lastSeenAt : 0;
        s.lastSeenAt = now;
      } else s.lastSeenAt = null;
      if (sock?.state === 'open') {
        s.openMs += now - sock.countedTo; sock.countedTo = now;
        if (!want.has(name)) { this.closeSocket(name, 1000, 'rotation'); continue; }
        const cfg = WS[name];
        if (cfg.ping && now - sock.lastPing >= cfg.pingMs) {
          sock.lastPing = now;
          try { sock.ws.send(typeof cfg.ping === 'string' ? cfg.ping : JSON.stringify(cfg.ping)); } catch {}
        }
        if (now - sock.lastMsgAt > STALL_MS) { s.stalls++; this.closeSocket(name, 4000, 'stalled'); }
      } else if (!sock && want.has(name) && now >= s.retryAt) {
        connecting.push(this.connect(name));
      }
    }
    return connecting;
  }

  closeSocket(name, code, reason) {
    const sock = this.sockets.get(name);
    this.sockets.delete(name);
    try { sock?.ws?.close(code, reason); } catch {}
  }

  async connect(name) {
    const cfg = WS[name], s = this.wsStat(name);
    s.connects++;
    this.sockets.set(name, {state: 'connecting'});
    try {
      const res = await fetch(cfg.url, {headers: {Upgrade: 'websocket'}});
      const ws = res.webSocket;
      if (!ws) {
        count(s.handshake, `http-${res.status}`);
        this.sockets.delete(name); s.retryAt = Date.now() + s.backoff; s.backoff = Math.min(300000, s.backoff * 2);
        return;
      }
      ws.accept();
      const now = Date.now();
      const sock = {state: 'open', ws, lastPing: now, lastMsgAt: now, countedTo: now};
      this.sockets.set(name, sock);
      s.opens++; s.backoff = 2000; count(s.handshake, '101');
      if (cfg.subscribe) ws.send(JSON.stringify(cfg.subscribe));
      ws.addEventListener('message', (ev) => {
        const at = Date.now();
        s.longestGapS = Math.max(s.longestGapS, Math.round((at - sock.lastMsgAt) / 1000));
        sock.lastMsgAt = at; s.messages++;
        if (typeof ev.data !== 'string' || ev.data === 'pong') return;
        try { if (cfg.isTrade(JSON.parse(ev.data))) s.trades++; } catch {}
      });
      ws.addEventListener('close', (ev) => {
        count(s.closes, String(ev.code));
        if (this.sockets.get(name) === sock) {
          s.openMs += Date.now() - sock.countedTo;
          this.sockets.delete(name);
          s.retryAt = Date.now() + s.backoff; s.backoff = Math.min(300000, s.backoff * 2);
        }
      });
      ws.addEventListener('error', () => { s.errors++; });
    } catch (e) {
      s.errors++; s.lastError = String(e?.message || e).slice(0, 160);
      this.sockets.delete(name); s.retryAt = Date.now() + s.backoff; s.backoff = Math.min(300000, s.backoff * 2);
    }
  }

  // ---------- summary ----------
  async refreshTrace() {
    try {
      const text = await (await fetch('https://cloudflare.com/cdn-cgi/trace', {signal: AbortSignal.timeout(8000)})).text();
      const kv = Object.fromEntries(text.trim().split('\n').map((l) => l.split('=')));
      this.trace = {at: Date.now(), ip: kv.ip || null, colo: kv.colo || null, loc: kv.loc || null};
    } catch { this.trace = {at: Date.now(), ip: null, colo: null, loc: null}; }
  }

  summary() {
    const now = Date.now(), restOut = {}, wsOut = {};
    for (const [name, s] of this.rest) {
      const outage = Math.max(s.longestOutageMs, s.outageStart ? now - s.outageStart : 0);
      const verdict = !s.attempts ? 'pending' : !s.ok ? 'blocked' : (s.ok / s.attempts >= 0.99 && outage <= 60000 ? 'ok' : 'flaky');
      restOut[name] = {role: s.role, verdict, successPct: pct(s.ok, s.attempts), attempts: s.attempts, p50ms: percentile(s.lat, 0.5),
        p95ms: percentile(s.lat, 0.95), statuses: s.statuses, errors: s.errors, lastError: s.lastError, maxFailStreak: s.maxFailStreak,
        longestOutageS: Math.round(outage / 1000), lastOkAt: s.lastOkAt ? new Date(s.lastOkAt).toISOString() : null};
    }
    for (const [name, s] of this.ws) {
      const verdict = s.scheduledMs < 120000 ? 'pending' : !s.trades ? 'blocked' : (s.openMs / s.scheduledMs >= 0.98 && s.stalls <= 2 ? 'ok' : 'flaky');
      wsOut[name] = {role: s.role, verdict, scheduledMin: Math.round(s.scheduledMs / 60000), openPctOfScheduled: pct(s.openMs, s.scheduledMs),
        connects: s.connects, opens: s.opens, handshake: s.handshake, closes: s.closes, errors: s.errors, stalls: s.stalls,
        messages: s.messages, trades: s.trades, tradesPerMin: s.openMs ? Math.round((s.trades / s.openMs) * 60000) : 0,
        longestGapS: s.longestGapS, lastError: s.lastError, currentlyOpen: this.sockets.get(name)?.state === 'open'};
    }
    const totalMessages = [...this.ws.values()].reduce((a, s) => a + s.messages, 0);
    return {version: VERSION, platform: 'cloudflare-durable-object-free', updatedAt: new Date(now).toISOString(),
      instanceStartedAt: new Date(this.started).toISOString(), firstStartedAt: new Date(this.firstStartedAt).toISOString(),
      boots: this.boots, hoursThisInstance: Math.round(((now - this.started) / 3600000) * 100) / 100,
      egress: this.trace, engineTicks: this.engine, streamMessagesThisInstance: totalMessages, rest: restOut, websockets: wsOut};
  }

  async publish() {
    let cpuTest = null;
    try { cpuTest = await (await this.env.CPU.get(this.env.CPU.idFromName('cpu-test-v1'), {locationHint: 'enam'}).fetch('https://do/stats')).json(); } catch {}
    const doc = {...this.summary(), cpuTest};
    const bad = [...Object.entries(doc.rest), ...Object.entries(doc.websockets)].filter(([, v]) => v.verdict !== 'ok' && v.verdict !== 'pending').map(([k, v]) => `${k}=${v.verdict}`);
    console.log(JSON.stringify({at: doc.updatedAt, egress: doc.egress, notOk: bad, cpu: cpuTest?.batches}));
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_ANON_KEY) return;
    try {
      const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/tara_state?on_conflict=doc_path`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: {apikey: this.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${this.env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'},
        body: JSON.stringify({doc_path: DOC_PATH, data: doc, updated_at: new Date().toISOString()}),
      });
      if (!res.ok) console.error(`supabase upsert failed: HTTP ${res.status}`);
    } catch (e) { console.error(`supabase upsert failed: ${e?.message}`); }
  }
}

// Runs the engine in growing batches, one batch every 5 minutes, and records
// which batch sizes finish. A batch killed by a CPU limit never records its
// completion. Kept in its own object so a CPU kill cannot reset the feed probe.
export class CpuTest extends DurableObject {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/ensure') {
      const at = await this.ctx.storage.getAlarm();
      if (!at || at < Date.now() - 600000) await this.ctx.storage.setAlarm(Date.now() + 5000);
      return new Response('ok');
    }
    if (path === '/stats') {
      const batches = {};
      for (const n of CPU_BATCHES) batches[n] = {started: (await this.ctx.storage.get(`started_${n}`)) || 0, completed: (await this.ctx.storage.get(`completed_${n}`)) || 0};
      return Response.json({batches, lastError: (await this.ctx.storage.get('lastError')) || null, note: 'batch size = engine runs per invocation; about 1.5 ms each on a desktop CPU'});
    }
    return new Response('not found', {status: 404});
  }

  async alarm() {
    const i = ((await this.ctx.storage.get('next')) || 0) % CPU_BATCHES.length;
    const n = CPU_BATCHES[i];
    await this.ctx.storage.put({next: i + 1, [`started_${n}`]: ((await this.ctx.storage.get(`started_${n}`)) || 0) + 1});
    try { runEngine(n); } catch (e) { await this.ctx.storage.put('lastError', String(e?.message || e).slice(0, 160)); }
    await this.ctx.storage.put(`completed_${n}`, ((await this.ctx.storage.get(`completed_${n}`)) || 0) + 1);
    await this.ctx.storage.setAlarm(Date.now() + CPU_EVERY_MS);
  }
}

const probe = (env) => env.PROBE.get(env.PROBE.idFromName('feed-probe-v1'), {locationHint: 'enam'});
const cpu = (env) => env.CPU.get(env.CPU.idFromName('cpu-test-v1'), {locationHint: 'enam'});

export default {
  // Every minute: make sure both objects have a live alarm. This is the
  // watchdog that restarts the loop if an alarm ever gives up.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([probe(env).fetch('https://do/ensure'), cpu(env).fetch('https://do/ensure')]));
  },
  // Read-only status. Never starts or changes anything except arming the alarm.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/health')) return new Response('Not found', {status: 404});
    try {
      await probe(env).fetch('https://do/ensure');
      const [summary, cpuTest] = await Promise.all([
        probe(env).fetch('https://do/summary').then((r) => r.json()),
        cpu(env).fetch('https://do/stats').then((r) => r.json()).catch((e) => ({error: String(e?.stack || e).slice(0, 400)})),
      ]);
      return Response.json({...summary, cpuTest}, {headers: {'Cache-Control': 'no-store'}});
    } catch (e) {
      return Response.json({error: String(e?.stack || e).slice(0, 800)}, {status: 500, headers: {'Cache-Control': 'no-store'}});
    }
  },
};
