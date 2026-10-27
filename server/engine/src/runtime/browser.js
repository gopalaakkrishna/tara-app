// Server stand-ins for the browser APIs TaraApp's logic touches.
//
// localStorage is an in-memory store the engine saves to Durable Object
// storage, so a restart picks up where it left off, as a browser reload does.
// fetch routes the site's relative /api/* calls and the hosts Cloudflare
// cannot reach (Kalshi, OKX) through the free Render proxy, and in shadow mode
// refuses anything that is not a plain read. Sound, notifications, tabs,
// IndexedDB and the service worker do not exist here.

const PAGES = 'https://taracalls.pages.dev';
const PROXY = 'https://tara-kalshi-proxy.onrender.com';
const PAGES_ROUTES = new Set(['/api/economic-calendar', '/api/learning']);
const nativeFetch = (...args) => globalThis.fetch(...args);

const cfg = {mode: 'shadow', log: () => {}};
export const browserStats = {requests: {}, paths: {}, failures: {}, blocked: [], wsOpened: {}, wsFailed: {}, candleFallbacks: {}};
export function configureBrowser(options = {}) { Object.assign(cfg, options); }

const bump = (map, key) => { map[key] = (map[key] || 0) + 1; };
const remember = (entry) => { browserStats.blocked.push({...entry, at: Date.now()}); if (browserStats.blocked.length > 50) browserStats.blocked.shift(); };

// ---------- storage ----------
class MemoryStorage {
  constructor() { this.map = new Map(); this.dirty = new Set(); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { k = String(k); return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { k = String(k); v = String(v); if (this.map.get(k) === v) return; this.map.set(k, v); this.dirty.add(k); }
  removeItem(k) { k = String(k); if (!this.map.has(k)) return; this.map.delete(k); this.dirty.add(k); }
  clear() { for (const k of this.map.keys()) this.dirty.add(k); this.map.clear(); }
  // Changed keys since the last call: value, or null when removed.
  takeChanges() { const out = {}; for (const k of this.dirty) out[k] = this.map.has(k) ? this.map.get(k) : null; this.dirty.clear(); return out; }
  restore(entries) { this.map = new Map(Object.entries(entries)); this.dirty.clear(); }
  bytes() { let n = 0; for (const [k, v] of this.map) n += k.length + v.length; return n; }
}
export const localStorage = new MemoryStorage();
export const sessionStorage = new MemoryStorage();

// ---------- fetch ----------
export function routeUrl(input) {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
  if (!raw) return raw;
  if (raw.startsWith('/')) {
    const path = raw.split('?')[0];
    if (PAGES_ROUTES.has(path) || !path.startsWith('/api/')) return PAGES + raw;
    return PROXY + raw.slice('/api'.length);
  }
  const cors = raw.match(/^https:\/\/corsproxy\.io\/\?(?:url=)?(.+)$/);
  if (cors) return routeUrl(decodeURIComponent(cors[1]));
  const kalshi = raw.match(/^https:\/\/(?:api\.elections|external-api)\.kalshi\.com\/trade-api\/v2\/(.*)$/);
  if (kalshi) return `${PROXY}/kalshi-public/${kalshi[1]}`;
  const okx = raw.match(/^https:\/\/www\.okx\.com\/api\/v5\/(.*)$/);
  if (okx) return `${PROXY}/okx/${okx[1]}`;
  return raw;
}

// Coinbase rate-limits Cloudflare's shared egress IPs. On Oct 26 about half
// the engine's candle reads came back 429, and the site's candle hook swaps its
// history for an empty list on any failed poll, so the engine kept dropping
// back to "Loading candle history". A browser on a home IP almost never sees
// this. A failed candle read is retried once; if that fails too, the last good
// response for the same product and granularity is served while it is recent
// enough for the readiness check to accept it. Past that, the failure goes
// through and the engine waits, as the site would.
const CANDLE_PATH = /^\/products\/[^/]+\/candles$/;
const lastCandles = new Map(); // `${pathname}|${granularity}` -> {body, at}
export const candleFallbackMaxAgeMs = (granularity) => Math.min(granularity + 30, 120) * 1000;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchCandles(url, init, route) {
  const u = new URL(url);
  const granularity = Number(u.searchParams.get('granularity')) || 0;
  const key = `${u.pathname}|${granularity}`;
  let resp = null, error = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await pause(300 + Math.random() * 700);
    try {
      resp = await nativeFetch(url, init);
      error = null;
      if (resp.ok) {
        const body = await resp.text();
        if (body.trimStart().startsWith('[')) lastCandles.set(key, {body, at: Date.now()});
        return new Response(body, {status: resp.status, headers: {'content-type': resp.headers.get('content-type') || 'application/json'}});
      }
      bump(browserStats.failures, `${route} HTTP ${resp.status}`);
      if (resp.status !== 429 && resp.status < 500) return resp;
      if (!attempt) await resp.body?.cancel();
    } catch (err) {
      error = err;
      bump(browserStats.failures, `${route} ${String(err?.message || err).slice(0, 80)}`);
    }
  }
  const last = lastCandles.get(key);
  if (last && Date.now() - last.at <= candleFallbackMaxAgeMs(granularity)) {
    await resp?.body?.cancel();
    bump(browserStats.candleFallbacks, `${granularity}s served last good`);
    return new Response(last.body, {status: 200, headers: {'content-type': 'application/json', 'x-tara-engine': 'last-good-candles'}});
  }
  bump(browserStats.candleFallbacks, `${granularity}s none recent`);
  if (error) throw error;
  return resp;
}

const headerList = (h) => { if (!h) return []; if (typeof h.forEach === 'function' && !Array.isArray(h)) { const out = []; h.forEach((v, k) => out.push(k)); return out; } return Array.isArray(h) ? h.map(([k]) => k) : Object.keys(h); };

export async function fetch(input, init = {}) {
  const url = routeUrl(input);
  const method = String(init.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
  let host = 'invalid';
  try { host = new URL(url).host; } catch (_) {}
  if (cfg.mode === 'shadow') {
    const authed = headerList(init.headers).some((k) => /^kalshi-access/i.test(k));
    if ((method !== 'GET' && method !== 'HEAD') || authed || /discord(app)?\.com/i.test(url)) {
      remember({kind: 'fetch', method, host, authed});
      cfg.log('blocked', {method, host, authed});
      throw new TypeError(`blocked in shadow mode: ${method} ${host}`);
    }
  }
  bump(browserStats.requests, host);
  let route = host;
  try { const u = new URL(url); route = `${u.host}${u.pathname.split('/').slice(0, 4).join('/')}`; } catch (_) {}
  bump(browserStats.paths, route);
  const {cache, credentials, mode, referrerPolicy, keepalive, ...rest} = init; // options Workers reject
  // Browsers always send a User-Agent and Workers send none; Coinbase answers
  // 400 to ranged candle requests without one.
  const headers = new Headers(rest.headers || (typeof input === 'object' && input?.headers) || undefined);
  if (!headers.has('user-agent')) headers.set('User-Agent', 'Mozilla/5.0 (compatible; tara-engine/1)');
  rest.headers = headers;
  if (host === 'api.exchange.coinbase.com' && CANDLE_PATH.test(new URL(url).pathname)) return fetchCandles(url, rest, route);
  try {
    const resp = await nativeFetch(url, rest);
    if (!resp.ok) bump(browserStats.failures, `${route} HTTP ${resp.status}`);
    return resp;
  } catch (err) {
    bump(browserStats.failures, `${route} ${String(err?.message || err).slice(0, 80)}`);
    throw err;
  }
}

// ---------- WebSocket (Workers open sockets with a fetch upgrade) ----------
export class WebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  constructor(url, protocols) {
    this.url = String(url); this.protocol = ''; this.readyState = 0; this.binaryType = 'blob';
    this.onopen = this.onmessage = this.onclose = this.onerror = null;
    this._listeners = {open: new Set(), message: new Set(), close: new Set(), error: new Set()};
    const host = (() => { try { return new URL(this.url).host; } catch (_) { return 'invalid'; } })();
    this._host = host;
    if (cfg.mode === 'shadow' && /kalshi\.com$/i.test(host)) {
      remember({kind: 'websocket', host});
      queueMicrotask(() => this._fail('blocked in shadow mode'));
      return;
    }
    this._connect(protocols).catch((err) => this._fail(err?.message || String(err)));
  }
  async _connect(protocols) {
    if (typeof globalThis.WebSocketPair === 'undefined') {
      const ws = new globalThis.WebSocket(this.url, protocols);
      this._ws = ws;
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => this._open();
      ws.onmessage = (e) => this._emit('message', {data: e.data});
      ws.onerror = () => this._emit('error', {message: 'socket error'});
      ws.onclose = (e) => this._closed(e.code, e.reason);
      return;
    }
    const resp = await nativeFetch(this.url.replace(/^ws/i, 'http'), {headers: {Upgrade: 'websocket'}});
    const ws = resp.webSocket;
    if (!ws) throw new Error(`upgrade refused: HTTP ${resp.status}`);
    ws.accept();
    this._ws = ws;
    ws.addEventListener('message', (e) => this._emit('message', {data: e.data}));
    ws.addEventListener('close', (e) => this._closed(e.code, e.reason));
    ws.addEventListener('error', () => this._emit('error', {message: 'socket error'}));
    this._open();
  }
  _open() { if (this.readyState !== 0) return; this.readyState = 1; bump(browserStats.wsOpened, this._host); this._emit('open', {}); }
  _fail(message) { bump(browserStats.wsFailed, this._host); this._emit('error', {message}); this._closed(1006, message); }
  _closed(code, reason) { if (this.readyState === 3) return; this.readyState = 3; this._emit('close', {code: code || 1006, reason: reason || '', wasClean: code === 1000}); }
  _emit(type, extra) {
    const ev = {type, target: this, currentTarget: this, ...extra};
    try { this[`on${type}`]?.(ev); } catch (err) { cfg.log('ws-handler', {type, error: err?.message}); }
    for (const fn of this._listeners[type]) { try { fn.call(this, ev); } catch (err) { cfg.log('ws-handler', {type, error: err?.message}); } }
  }
  addEventListener(type, fn) { this._listeners[type]?.add(fn); }
  removeEventListener(type, fn) { this._listeners[type]?.delete(fn); }
  send(data) { if (this.readyState !== 1) throw new Error('WebSocket is not open'); this._ws.send(data); }
  close(code = 1000, reason = '') { if (this.readyState >= 2) return; this.readyState = 2; try { this._ws?.close(code, reason); } catch (_) {} this._closed(code, reason); }
}

// ---------- everything else ----------
const noop = () => {};
const element = () => ({style: {}, dataset: {}, classList: {add: noop, remove: noop, toggle: noop, contains: () => false},
  setAttribute: noop, getAttribute: () => null, appendChild: (c) => c, removeChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
  querySelector: () => null, querySelectorAll: () => [], play: () => Promise.resolve(), pause: noop, focus: noop, blur: noop});
export const document = {visibilityState: 'visible', hidden: false, readyState: 'complete', title: 'Tara engine', cookie: '',
  addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true, createElement: element,
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], hasFocus: () => true,
  body: element(), head: element(), documentElement: element()};
export const navigator = {onLine: true, userAgent: 'tara-engine/1', language: 'en-US', languages: ['en-US'], hardwareConcurrency: 1,
  sendBeacon: () => false, vibrate: () => false};
export const location = {href: 'https://tara-engine.local/', origin: 'https://tara-engine.local', protocol: 'https:', host: 'tara-engine.local',
  hostname: 'tara-engine.local', port: '', pathname: '/', search: '', hash: '', reload: noop, assign: noop, replace: noop};
// ---------- IndexedDB (the subset Tara uses: one keyPath store, get and put) ----------
// The site keeps its full Call archive here and only a trimmed copy in
// localStorage, so without this a restart would shrink the ledger. Records
// are kept in memory and saved by the engine with localStorage, as JSON.
class IdbData {
  constructor() { this.stores = new Map(); this.dirty = new Set(); }
  store(name) { if (!this.stores.has(name)) this.stores.set(name, new Map()); return this.stores.get(name); }
  takeChanges() {
    const out = {};
    for (const id of this.dirty) { const [db, st, ...k] = id.split('\u001f'); const v = this.stores.get(`${db}\u001f${st}`)?.get(k.join('\u001f')); out[id] = v === undefined ? null : JSON.stringify(v); }
    this.dirty.clear();
    return out;
  }
  restore(entries) {
    this.stores = new Map(); this.dirty.clear();
    for (const [id, json] of Object.entries(entries)) { const [db, st, ...k] = id.split('\u001f'); try { this.store(`${db}\u001f${st}`).set(k.join('\u001f'), JSON.parse(json)); } catch (_) {} }
  }
  bytes() { let n = 0; for (const s of this.stores.values()) for (const v of s.values()) n += JSON.stringify(v).length; return n; }
}
export const idbData = new IdbData();
const later = (fn) => setTimeout(fn, 0);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
function idbRequest() { return {result: undefined, error: null, onsuccess: null, onerror: null}; }
function idbDatabase(name) {
  const stores = new Set([...idbData.stores.keys()].filter((k) => k.startsWith(`${name}\u001f`)).map((k) => k.split('\u001f')[1]));
  const db = {name, objectStoreNames: {contains: (s) => stores.has(s)},
    createObjectStore: (s, {keyPath} = {}) => { stores.add(s); idbData.store(`${name}\u001f${s}`); db.keyPaths[s] = keyPath; },
    keyPaths: {}, close: () => {},
    transaction: (storeName) => {
      let pending = 0, failed = false;
      const tx = {error: null, oncomplete: null, onerror: null, onabort: null,
        abort: () => { failed = true; later(() => tx.onabort?.({target: tx})); },
        objectStore: (s) => {
          const map = idbData.store(`${name}\u001f${s}`);
          const op = (fn) => { const req = idbRequest(); pending++; later(() => { try { req.result = fn(); req.onsuccess?.({target: req}); } catch (err) { req.error = err; failed = true; req.onerror?.({target: req}); } if (--pending === 0) later(() => { if (!failed) tx.oncomplete?.({target: tx}); }); }); return req; };
          return {
            get: (key) => op(() => clone(map.get(String(key)))),
            put: (value) => op(() => { const key = String(value?.[db.keyPaths[s] || 'key']); map.set(key, clone(value)); idbData.dirty.add(`${name}\u001f${s}\u001f${key}`); return key; }),
            delete: (key) => op(() => { map.delete(String(key)); idbData.dirty.add(`${name}\u001f${s}\u001f${String(key)}`); }),
          };
        }};
      void storeName;
      return tx;
    }};
  return db;
}
export const indexedDB = {
  open(name) {
    const req = {...idbRequest(), onupgradeneeded: null, onblocked: null};
    later(() => {
      const db = idbDatabase(name);
      req.result = db;
      req.onupgradeneeded?.({target: req});
      req.onsuccess?.({target: req});
    });
    return req;
  },
};
export class BroadcastChannel { constructor(name) { this.name = name; } postMessage() {} addEventListener() {} removeEventListener() {} close() {} }
export class Notification { static permission = 'denied'; static requestPermission() { return Promise.resolve('denied'); } constructor() {} close() {} }
export class Audio { constructor() { this.volume = 1; this.currentTime = 0; } play() { return Promise.resolve(); } pause() {} addEventListener() {} }
export class Image { constructor() { this.src = ''; } }
export const AudioContext = undefined;
export const webkitAudioContext = undefined;
export const alert = noop;
export const confirm = () => false;
export const prompt = () => null;
export const requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
export const cancelAnimationFrame = (id) => clearTimeout(id);
export const matchMedia = () => ({matches: false, media: '', addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop});
export const getComputedStyle = () => ({getPropertyValue: () => ''});
export const screen = {width: 1920, height: 1080};
export const window = {document, navigator, location, localStorage, sessionStorage, fetch, WebSocket, BroadcastChannel, Notification, Audio, Image,
  alert, confirm, prompt, requestAnimationFrame, cancelAnimationFrame, matchMedia, getComputedStyle, screen, indexedDB,
  innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
  setTimeout: (...a) => setTimeout(...a), clearTimeout: (...a) => clearTimeout(...a), setInterval: (...a) => setInterval(...a), clearInterval: (...a) => clearInterval(...a),
  addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true, open: () => null, scrollTo: noop, isSecureContext: true};
