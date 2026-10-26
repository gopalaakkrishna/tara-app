// Tara always-on Call engine, step 2: the website's own Call engine running
// 24/7 in one Durable Object, in SHADOW mode.
//
// src/generated/engine-app.js is the part of TaraApp (src/App.jsx) that makes
// BTC 15-minute Calls: feeds, window tracking, analysis, the Call candidate,
// commit/seal and the lifecycle. scripts/build-app.mjs pulls it out at build
// time and src/runtime/ supplies a tiny React and server stand-ins for the
// browser. Shadow mode: no orders, no Discord, no writes to the site's docs.
// The engine publishes only its own Calls and the shadow-week comparison with
// the website's (src/compare.js), to shadow/engineCalls_v1. /report shows it.
//
// Durable Objects restart every few hours. localStorage, the IndexedDB ledger
// and the comparison are saved to the object's SQLite storage, so a restart
// resumes like a reload.
import {DurableObject} from 'cloudflare:workers';
import {EngineCore, SHADOW_DOC} from './engine.js';
import {renderReport} from './report.js';

const VERSION = 'tara-engine-shadow-2';
const ALARM_MS = 10_000; // keeps the object awake; the app's own timers drive the loop
const CHUNK = 500_000; // characters per SQLite row (rows max out at 2 MB)

function sqlStorage(sql) {
  sql.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT NOT NULL, part INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, part))');
  const put = (k, v) => {
    const parts = Math.max(1, Math.ceil(v.length / CHUNK));
    for (let i = 0; i < parts; i++) sql.exec('INSERT OR REPLACE INTO kv (k, part, v) VALUES (?, ?, ?)', k, i, v.slice(i * CHUNK, (i + 1) * CHUNK));
    sql.exec('DELETE FROM kv WHERE k = ? AND part >= ?', k, parts);
  };
  return {
    async load() {
      const out = {localStorage: {}, idb: {}, compare: ''};
      for (const row of sql.exec('SELECT k, part, v FROM kv ORDER BY k, part')) {
        if (row.k === '__compare') out.compare += row.v;
        else if (row.k.startsWith('ls:')) { const k = row.k.slice(3); out.localStorage[k] = (out.localStorage[k] || '') + row.v; }
        else if (row.k.startsWith('idb:')) { const k = row.k.slice(4); out.idb[k] = (out.idb[k] || '') + row.v; }
      }
      try { out.compare = out.compare ? JSON.parse(out.compare) : null; } catch (_) { out.compare = null; }
      sql.exec('DELETE FROM kv WHERE k = ?', '__calls'); // pre-comparison Call list (first hours of step 2)
      return out;
    },
    async save({localStorage, idb, compare}) {
      for (const [prefix, changes] of [['ls:', localStorage], ['idb:', idb]]) {
        for (const [k, v] of Object.entries(changes)) { if (v === null) sql.exec('DELETE FROM kv WHERE k = ?', prefix + k); else put(prefix + k, v); }
      }
      put('__compare', JSON.stringify(compare));
    },
  };
}

async function publishShadow(env, doc) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/tara_state`, {
    method: 'POST',
    headers: {apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify({doc_path: SHADOW_DOC, data: doc, updated_at: new Date().toISOString()}),
  });
  if (!res.ok) throw new Error(`shadow publish HTTP ${res.status}`);
}

export class TaraEngine extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.bootAt = Date.now();
    this.starting = null;
    this.logTail = [];
  }

  log(event, data) {
    this.logTail.push({at: Date.now(), event, data});
    if (this.logTail.length > 40) this.logTail.shift();
    if (event === 'error' || event === 'call' || event === 'blocked') console.log(event, JSON.stringify(data));
  }

  ensureRunning() {
    if (this.env.ENGINE_MODE !== 'shadow') throw new Error(`ENGINE_MODE must be "shadow" (got ${this.env.ENGINE_MODE}); live mode is not built yet`);
    if (!this.starting) {
      this.core = new EngineCore({storage: sqlStorage(this.ctx.storage.sql), mode: 'shadow', saveMs: 120_000,
        supabase: {url: this.env.SUPABASE_URL, key: this.env.SUPABASE_ANON_KEY},
        publish: (doc) => publishShadow(this.env, {...doc, engine: VERSION, bootAt: this.bootAt}),
        log: (e, d) => this.log(e, d)});
      this.starting = this.core.start().catch((err) => { this.starting = null; throw err; });
    }
    return this.starting;
  }

  async armAlarm() {
    const at = await this.ctx.storage.getAlarm();
    if (!at || at < Date.now() - 30_000) await this.ctx.storage.setAlarm(Date.now() + 1000);
  }

  async alarm() {
    await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
    await this.ensureRunning();
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    try {
      await this.armAlarm();
      await this.ensureRunning();
      if (path === '/ensure') return new Response('ok');
      if (path === '/health') return Response.json({version: VERSION, bootAt: this.bootAt, ...this.core.health(), log: this.logTail.slice(-15)});
      if (path === '/compare') return Response.json({version: VERSION, comparison: this.core.compare.summary(), windows: this.core.rows()});
      if (path === '/report') return new Response(renderReport({summary: this.core.compare.summary(), rows: this.core.rows(), health: this.core.health({brief: true})}),
        {headers: {'Content-Type': 'text/html; charset=utf-8'}});
      return new Response('not found', {status: 404});
    } catch (err) {
      return Response.json({version: VERSION, error: String(err?.stack || err).slice(0, 1200)}, {status: 500});
    }
  }
}

const engine = (env) => env.ENGINE.get(env.ENGINE.idFromName('btc-15m'), {locationHint: 'enam'});

export default {
  // Watchdog: once a minute, make sure the engine is awake and its alarm is set.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(engine(env).fetch('https://do/ensure'));
  },
  // Read-only status. Starts the engine if it is not running; changes nothing else.
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = url.pathname === '/' ? '/report' : url.pathname === '/calls' ? '/compare' : url.pathname;
    if (request.method !== 'GET' || !['/health', '/compare', '/report'].includes(route)) return new Response('Not found', {status: 404});
    const res = await engine(env).fetch(`https://do${route}`);
    return new Response(res.body, {status: res.status, headers: {'Content-Type': res.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store'}});
  },
};
