// Tara feed probe. Step 1 of the always-on engine plan.
//
// Question it answers: which market-data feeds can Tara's Call engine reach
// from a cloud server (Railway), and how reliably? In the browser these feeds
// come from the owner's home connection. Several exchanges block datacenter
// IPs (Binance and Bybit are known to), and the trade-flow feed the engine
// scores on comes from exactly those two. Finding that out before any engine
// work is the point.
//
// Read-only. Places no orders, holds no exchange credentials, posts nothing
// to Discord. Every 5 minutes it upserts one small summary document,
// research/feedProbe_railway_v1, into the shared tara_state table so the
// result can be read without anyone's browser. Without SUPABASE_URL and
// SUPABASE_ANON_KEY it only logs.
//
// Cadences mirror the browser app (src/App.jsx v14.7.13) so failure rates are
// comparable: spot every 1.5s there, 5s here to stay polite; Kalshi events 8s.

import http from 'node:http';

const VERSION = 'feed-probe-v1';
const DOC_PATH = 'research/feedProbe_railway_v1';
const PUBLISH_MS = 5 * 60 * 1000;
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';
const STARTED = Date.now();
const UA = 'TaraFeedProbe/1 (+https://taracalls.pages.dev)';

const nowSec = () => Math.floor(Date.now() / 1000);
const isNum = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
const okxFirst = (d) => d?.code === '0' && Array.isArray(d.data) && d.data.length > 0;

// [name, role, intervalMs, url (string or function), check(json) -> bool]
// role: "decision" feeds change Calls; "context" feeds are smaller score
// inputs; "candidate" feeds are possible replacements if a decision feed is
// blocked; "info" explains a block.
const REST = [
  ['coinbase-ticker', 'decision', 5000, 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', (d) => isNum(d?.price)],
  ['coinbase-candles-1m', 'decision', 30000, 'https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60', (d) => Array.isArray(d) && d.length > 30],
  ['coinbase-spot-v2', 'context', 10000, 'https://api.coinbase.com/v2/prices/BTC-USD/spot', (d) => isNum(d?.data?.amount)],
  ['kraken-ticker', 'decision', 5000, 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD', (d) => Array.isArray(d?.error) && d.error.length === 0 && !!d.result],
  ['kraken-ohlc-1m', 'decision', 30000, 'https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1', (d) => Array.isArray(d?.error) && d.error.length === 0 && !!d.result],
  ['okx-ticker', 'decision', 5000, 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT', okxFirst],
  ['okx-candles-1m', 'decision', 30000, 'https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=1m&limit=300', okxFirst],
  ['okx-mark-price', 'decision', 8000, 'https://www.okx.com/api/v5/public/mark-price?instType=SWAP&instId=BTC-USDT-SWAP', okxFirst],
  ['okx-index-ticker', 'decision', 8000, 'https://www.okx.com/api/v5/market/index-tickers?instId=BTC-USD', okxFirst],
  ['okx-funding-rate', 'decision', 8000, 'https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP', okxFirst],
  ['okx-open-interest', 'decision', 8000, 'https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP', okxFirst],
  ['okx-long-short', 'context', 60000, 'https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=5m', okxFirst],
  ['okx-swap-books', 'decision', 5000, 'https://www.okx.com/api/v5/market/books?instId=BTC-USDT-SWAP&sz=50', okxFirst],
  ['bybit-ticker', 'decision', 5000, 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT', (d) => d?.retCode === 0 && d?.result?.list?.length > 0],
  ['bybit-kline', 'context', 30000, 'https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=1&limit=200', (d) => d?.retCode === 0],
  ['binance-futures-rest', 'info', 30000, 'https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT', (d) => isNum(d?.price)],
  ['kalshi-15m-events', 'decision', 8000, () => `https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXBTC15M&with_nested_markets=true&status=open&limit=50&min_close_ts=${nowSec()}`, (d) => Array.isArray(d?.events)],
  ['kalshi-15m-events-external', 'decision', 8000, () => `https://external-api.kalshi.com/trade-api/v2/events?series_ticker=KXBTC15M&with_nested_markets=true&status=open&limit=50&min_close_ts=${nowSec()}`, (d) => Array.isArray(d?.events)],
  ['kalshi-hourly-events', 'context', 60000, () => `https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXBTCD&with_nested_markets=true&status=open&limit=20&min_close_ts=${nowSec()}`, (d) => Array.isArray(d?.events)],
  ['deribit-options', 'context', 180000, 'https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option', (d) => Array.isArray(d?.result)],
  ['tara-economic-calendar', 'context', 300000, 'https://taracalls.pages.dev/api/economic-calendar', (d) => !!d && typeof d === 'object'],
  ['tara-liq', 'context', 120000, 'https://taracalls.pages.dev/api/liq', (d) => !!d && typeof d === 'object'],
];

// Trade streams. The first two are what the browser uses today for the tape
// (globalFlow / tapeWindows); the rest are replacement candidates.
const WS = [
  { name: 'binance-futures-aggTrade', role: 'decision', url: 'wss://fstream.binance.com/ws/btcusdt@aggTrade',
    isTrade: (m) => m?.e === 'aggTrade' },
  { name: 'bybit-linear-publicTrade', role: 'decision', url: 'wss://stream.bybit.com/v5/public/linear',
    subscribe: { op: 'subscribe', args: ['publicTrade.BTCUSDT'] }, ping: { op: 'ping' }, pingMs: 20000,
    isTrade: (m) => m?.topic === 'publicTrade.BTCUSDT' && Array.isArray(m.data) },
  { name: 'okx-swap-trades', role: 'candidate', url: 'wss://ws.okx.com:8443/ws/v5/public',
    subscribe: { op: 'subscribe', args: [{ channel: 'trades', instId: 'BTC-USDT-SWAP' }] }, ping: 'ping', pingMs: 20000,
    isTrade: (m) => m?.arg?.channel === 'trades' && Array.isArray(m.data) },
  { name: 'coinbase-matches', role: 'candidate', url: 'wss://ws-feed.exchange.coinbase.com',
    subscribe: { type: 'subscribe', product_ids: ['BTC-USD'], channels: ['matches'] },
    isTrade: (m) => m?.type === 'match' || m?.type === 'last_match' },
  { name: 'kraken-trade-v2', role: 'candidate', url: 'wss://ws.kraken.com/v2',
    subscribe: { method: 'subscribe', params: { channel: 'trade', symbol: ['BTC/USD'] } }, ping: { method: 'ping' }, pingMs: 30000,
    isTrade: (m) => m?.channel === 'trade' && Array.isArray(m.data) },
];

// ---------- REST checks ----------
const rest = new Map();
function restStat(name, role) {
  if (!rest.has(name)) rest.set(name, { role, attempts: 0, ok: 0, fail: 0, statuses: {}, errors: {}, lat: [],
    lastOkAt: null, lastFailAt: null, lastError: null, failStreak: 0, maxFailStreak: 0, outageStart: null, longestOutageMs: 0 });
  return rest.get(name);
}
function countInto(obj, key) { obj[key] = (obj[key] || 0) + 1; }

async function runRest([name, role, , url, check]) {
  const s = restStat(name, role);
  s.attempts++;
  const t0 = Date.now();
  let status = 'none', error = null;
  try {
    const res = await fetch(typeof url === 'function' ? url() : url, {
      headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
    status = String(res.status);
    const text = await res.text();
    if (!res.ok) error = `http-${res.status}`;
    else {
      let body;
      try { body = JSON.parse(text); } catch { error = text.trimStart().startsWith('<') ? 'html-body' : 'bad-json'; }
      if (!error && !check(body)) error = 'unexpected-shape';
    }
  } catch (e) {
    error = e?.name === 'TimeoutError' ? 'timeout' : (e?.cause?.code || e?.name || 'network');
  }
  const ms = Date.now() - t0, at = Date.now();
  countInto(s.statuses, status);
  if (!error) {
    s.ok++; s.lastOkAt = at; s.lat.push(ms); if (s.lat.length > 500) s.lat.shift();
    if (s.outageStart) { s.longestOutageMs = Math.max(s.longestOutageMs, at - s.outageStart); s.outageStart = null; }
    s.failStreak = 0;
  } else {
    s.fail++; s.lastFailAt = at; s.lastError = error; countInto(s.errors, error);
    s.failStreak++; s.maxFailStreak = Math.max(s.maxFailStreak, s.failStreak);
    if (!s.outageStart) s.outageStart = at;
  }
}

function scheduleRest(entry) {
  const tick = () => runRest(entry).catch(() => {}).finally(() => setTimeout(tick, entry[2]));
  // Stagger the first run so twenty requests do not leave in the same second.
  setTimeout(tick, Math.floor(Math.random() * Math.min(entry[2], 5000)));
}

// ---------- WebSocket checks ----------
const ws = new Map();
function connect(cfg) {
  const s = ws.get(cfg.name) || { role: cfg.role, connects: 0, opens: 0, closes: {}, errors: 0, messages: 0, trades: 0,
    openMs: 0, openedAt: null, lastMsgAt: null, longestGapMs: 0, stalls: 0, firstTradeAt: null, backoff: 1000 };
  ws.set(cfg.name, s);
  s.connects++;
  let sock, pinger, watchdog;
  try { sock = new WebSocket(cfg.url); } catch (e) { s.errors++; return retry(); }
  sock.addEventListener('open', () => {
    s.opens++; s.openedAt = Date.now(); s.lastMsgAt = Date.now(); s.backoff = 1000;
    if (cfg.subscribe) sock.send(JSON.stringify(cfg.subscribe));
    if (cfg.ping) pinger = setInterval(() => { try { sock.send(typeof cfg.ping === 'string' ? cfg.ping : JSON.stringify(cfg.ping)); } catch {} }, cfg.pingMs);
    // An open socket that stops talking is as bad as a closed one for the tape.
    watchdog = setInterval(() => {
      if (Date.now() - s.lastMsgAt > 60000) { s.stalls++; try { sock.close(4000, 'stalled'); } catch {} }
    }, 10000);
  });
  sock.addEventListener('message', (ev) => {
    const at = Date.now();
    if (s.lastMsgAt) s.longestGapMs = Math.max(s.longestGapMs, at - s.lastMsgAt);
    s.lastMsgAt = at; s.messages++;
    if (typeof ev.data !== 'string' || ev.data === 'pong') return;
    try { if (cfg.isTrade(JSON.parse(ev.data))) { s.trades++; s.firstTradeAt ||= at; } } catch {}
  });
  sock.addEventListener('error', () => { s.errors++; });
  sock.addEventListener('close', (ev) => {
    clearInterval(pinger); clearInterval(watchdog);
    if (s.openedAt) { s.openMs += Date.now() - s.openedAt; s.openedAt = null; }
    countInto(s.closes, String(ev.code));
    retry();
  });
  function retry() {
    setTimeout(() => connect(cfg), s.backoff);
    s.backoff = Math.min(60000, s.backoff * 2);
  }
}

// ---------- summary ----------
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
function percentile(arr, p) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
let egress = null;
async function refreshEgress() {
  try { egress = (await (await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(8000) })).json()).ip; } catch {}
}

function verdictRest(s) {
  if (!s.attempts) return 'pending';
  if (!s.ok) return 'blocked';
  const rate = s.ok / s.attempts, outage = Math.max(s.longestOutageMs, s.outageStart ? Date.now() - s.outageStart : 0);
  return rate >= 0.99 && outage <= 60000 ? 'ok' : 'flaky';
}
function verdictWs(s) {
  const elapsed = Date.now() - STARTED;
  const open = s.openMs + (s.openedAt ? Date.now() - s.openedAt : 0);
  if (!s.trades) return elapsed < 120000 ? 'pending' : 'blocked';
  return open / elapsed >= 0.99 && s.stalls <= 2 ? 'ok' : 'flaky';
}

function summary() {
  const now = Date.now(), elapsed = now - STARTED;
  const restOut = {}, wsOut = {};
  for (const [name, s] of rest) {
    restOut[name] = { role: s.role, verdict: verdictRest(s), successPct: pct(s.ok, s.attempts), attempts: s.attempts,
      p50ms: percentile(s.lat, 0.5), p95ms: percentile(s.lat, 0.95), statuses: s.statuses, errors: s.errors,
      lastError: s.lastError, maxFailStreak: s.maxFailStreak,
      longestOutageS: Math.round(Math.max(s.longestOutageMs, s.outageStart ? now - s.outageStart : 0) / 1000),
      lastOkAt: s.lastOkAt ? new Date(s.lastOkAt).toISOString() : null };
  }
  for (const [name, s] of ws) {
    const open = s.openMs + (s.openedAt ? now - s.openedAt : 0);
    wsOut[name] = { role: s.role, verdict: verdictWs(s), openPct: pct(open, elapsed), connects: s.connects, opens: s.opens,
      closes: s.closes, errors: s.errors, stalls: s.stalls, trades: s.trades,
      tradesPerMin: elapsed ? Math.round((s.trades / elapsed) * 60000) : 0,
      longestGapS: Math.round(s.longestGapMs / 1000), currentlyOpen: !!s.openedAt };
  }
  return { version: VERSION, startedAt: new Date(STARTED).toISOString(), updatedAt: new Date(now).toISOString(),
    hoursRun: Math.round((elapsed / 3600000) * 100) / 100, node: process.version,
    region: process.env.RAILWAY_REPLICA_REGION || process.env.RAILWAY_REGION || null,
    service: process.env.RAILWAY_SERVICE_NAME || null, egressIp: egress, rest: restOut, websockets: wsOut };
}

async function publish() {
  const doc = summary();
  const bad = [...Object.entries(doc.rest), ...Object.entries(doc.websockets)].filter(([, v]) => v.verdict !== 'ok').map(([k, v]) => `${k}=${v.verdict}`);
  console.log(`[${doc.updatedAt}] ${doc.hoursRun}h egress=${doc.egressIp} region=${doc.region} not-ok: ${bad.join(', ') || 'none'}`);
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tara_state?on_conflict=doc_path`, {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ doc_path: DOC_PATH, data: doc, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) console.error(`supabase upsert failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  } catch (e) { console.error(`supabase upsert failed: ${e?.message}`); }
}

// ---------- start ----------
console.log(`${VERSION} starting; ${REST.length} REST checks, ${WS.length} streams; publishing ${SUPABASE_URL ? 'to Supabase' : 'to logs only'}`);
refreshEgress(); setInterval(refreshEgress, 3600000);
REST.forEach(scheduleRest);
WS.forEach(connect);
setTimeout(publish, 60000);
setInterval(publish, PUBLISH_MS);

// Read-only status page if Railway assigns a port. Never accepts writes.
if (process.env.PORT) {
  http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(summary(), null, 1));
    } else { res.writeHead(404); res.end(); }
  }).listen(Number(process.env.PORT));
}

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { await publish(); process.exit(0); });
