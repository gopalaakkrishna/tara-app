// The server runtime under the generated engine: the shadow-mode guard, URL
// routing, the IndexedDB stand-in and the mini React. No network: fetch is
// replaced with a recorder for the whole file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fetch, routeUrl, configureBrowser, indexedDB, idbData, WebSocket, browserStats, candleFallbackMaxAgeMs} from '../src/runtime/browser.js';
import {createRoot, useState, useEffect, useMemo, useRef} from '../src/runtime/react.js';

const seen = [];
globalThis.fetch = async (url, init = {}) => { seen.push({url, init}); return new Response('{}', {status: 200}); };
configureBrowser({mode: 'shadow'});

test('routes site API paths and blocked hosts through the proxies', () => {
  assert.equal(routeUrl('/api/kalshi-public/markets/X'), 'https://tara-kalshi-proxy.onrender.com/kalshi-public/markets/X');
  assert.equal(routeUrl('/api/okx/market/books?instId=BTC-USDT-SWAP&sz=50'), 'https://tara-kalshi-proxy.onrender.com/okx/market/books?instId=BTC-USDT-SWAP&sz=50');
  assert.equal(routeUrl('/api/economic-calendar'), 'https://taracalls.pages.dev/api/economic-calendar');
  assert.equal(routeUrl('https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXBTC15M'), 'https://tara-kalshi-proxy.onrender.com/kalshi-public/events?series_ticker=KXBTC15M');
  assert.equal(routeUrl('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT'), 'https://tara-kalshi-proxy.onrender.com/okx/market/ticker?instId=BTC-USDT');
  assert.equal(routeUrl(`https://corsproxy.io/?url=${encodeURIComponent('https://api.elections.kalshi.com/trade-api/v2/markets/Y')}`), 'https://tara-kalshi-proxy.onrender.com/kalshi-public/markets/Y');
  assert.equal(routeUrl('https://api.exchange.coinbase.com/products/BTC-USD/ticker'), 'https://api.exchange.coinbase.com/products/BTC-USD/ticker');
});

test('shadow mode refuses writes, signed Kalshi calls and Discord', async () => {
  seen.length = 0;
  await assert.rejects(fetch('/api/kalshi/portfolio/orders', {method: 'POST', body: '{}'}), /blocked in shadow mode/);
  await assert.rejects(fetch('/api/kalshi/portfolio/balance', {headers: {'KALSHI-ACCESS-KEY': 'k'}}), /blocked in shadow mode/);
  await assert.rejects(fetch('https://discord.com/api/webhooks/1/x'), /blocked in shadow mode/);
  await assert.rejects(fetch('https://example.com/x', {method: 'PATCH'}), /blocked in shadow mode/);
  assert.equal(seen.length, 0);
  await fetch('/api/kalshi-public/markets/X');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].init.headers.get('user-agent'), 'Mozilla/5.0 (compatible; tara-engine/1)');
});

// Each case uses its own product so the last-good copies never cross over.
const candleUrl = (product, granularity = 60) => `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}&start=a&end=b`;
async function withUpstream(replies, fn) {
  const saved = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return new Response(next.body ?? '{"message":"slow down"}', {status: next.status});
  };
  try { return await fn(calls); } finally { globalThis.fetch = saved; }
}

test('a rate-limited Coinbase candle read is retried once', async () => {
  await withUpstream([{status: 429}, {status: 200, body: '[[1,2,3,4,5,6]]'}], async (calls) => {
    const r = await fetch(candleUrl('RETRY-USD'));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), [[1, 2, 3, 4, 5, 6]]);
    assert.equal(calls.length, 2);
  });
});

test('two failed candle reads serve the last good copy while it is recent', async () => {
  await withUpstream([{status: 200, body: '[[9,1,2,3,4,5]]'}, {status: 429}, {status: 503}], async (calls) => {
    await (await fetch(candleUrl('CACHE-USD', 300))).json();
    const r = await fetch(candleUrl('CACHE-USD', 300));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-tara-engine'), 'last-good-candles');
    assert.deepEqual(await r.json(), [[9, 1, 2, 3, 4, 5]]);
    assert.equal(calls.length, 3);
    assert.equal(browserStats.candleFallbacks['300s served last good'], 1);
  });
});

test('a last good copy past the readiness limit is not served', async () => {
  assert.equal(candleFallbackMaxAgeMs(60), 90000);
  assert.equal(candleFallbackMaxAgeMs(900), 120000);
  const realNow = Date.now;
  await withUpstream([{status: 200, body: '[[7,1,2,3,4,5]]'}, {status: 429}, {status: 429}], async () => {
    await fetch(candleUrl('OLD-USD'));
    Date.now = () => realNow() + 91000;
    try {
      const r = await fetch(candleUrl('OLD-USD'));
      assert.equal(r.status, 429);
    } finally { Date.now = realNow; }
  });
});

test('a bad candle request is not retried and network errors still throw', async () => {
  await withUpstream([{status: 400}], async (calls) => {
    assert.equal((await fetch(candleUrl('BAD-USD'))).status, 400);
    assert.equal(calls.length, 1);
  });
  await withUpstream([new TypeError('network down'), new TypeError('network down')], async (calls) => {
    await assert.rejects(fetch(candleUrl('DOWN-USD')), /network down/);
    assert.equal(calls.length, 2);
  });
  await withUpstream([{status: 429}], async (calls) => {
    assert.equal((await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker')).status, 429);
    assert.equal(calls.length, 1);
  });
});

test('shadow mode refuses the Kalshi WebSocket', async () => {
  const ws = new WebSocket('wss://api.elections.kalshi.com/trade-api/ws/v2');
  const closed = await new Promise((resolve) => { ws.onclose = (e) => resolve(e); });
  assert.equal(ws.readyState, 3);
  assert.match(closed.reason, /blocked/);
});

test('IndexedDB stand-in keeps records across a save and restore', async () => {
  const open = () => new Promise((resolve) => { const r = indexedDB.open('TaraTradeDB', 1); r.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains('callLog')) db.createObjectStore('callLog', {keyPath: 'key'}); }; r.onsuccess = (e) => resolve(e.target.result); });
  const db = await open();
  await new Promise((resolve) => { const tx = db.transaction('callLog', 'readwrite'); tx.objectStore('callLog').put({key: 'taraCallLog', value: [{id: 1}]}); tx.oncomplete = resolve; });
  const saved = idbData.takeChanges();
  idbData.restore({});
  idbData.restore(saved);
  const db2 = await open();
  const got = await new Promise((resolve) => { const req = db2.transaction('callLog', 'readonly').objectStore('callLog').get('taraCallLog'); req.onsuccess = (e) => resolve(e.target.result); });
  assert.deepEqual(got.value, [{id: 1}]);
});

test('mini React: state, memo, refs and effect order match React', async () => {
  const events = [];
  let setN;
  function App() {
    const [n, set] = useState(() => 1);
    setN = set;
    const ref = useRef(0);
    ref.current++;
    const double = useMemo(() => { events.push(`memo ${n}`); return n * 2; }, [n]);
    useEffect(() => { events.push(`effect ${n}`); return () => events.push(`cleanup ${n}`); }, [n]);
    useEffect(() => { events.push('mount'); }, []);
    events.push(`render ${n} ${double} ${ref.current}`);
    return null;
  }
  const root = createRoot(App, {});
  root.render();
  assert.deepEqual(events, ['memo 1', 'render 1 2 1', 'effect 1', 'mount']);
  events.length = 0;
  setN(1); // same value: no render
  setN((v) => v + 1);
  await Promise.resolve();
  assert.deepEqual(events, ['memo 2', 'render 2 4 2', 'cleanup 1', 'effect 2']);
  events.length = 0;
  root.unmount();
  assert.deepEqual(events, ['cleanup 2']);
});

test('mini React: errors are reported, not thrown, and state survives', () => {
  const errors = [];
  let boom = true;
  function App() { const [v] = useState(5); useEffect(() => { if (boom) throw new Error('effect boom'); }); return v; }
  const root = createRoot(App, {}, {onError: (err, where) => errors.push(`${where}: ${err.message}`)});
  root.render();
  boom = false;
  root.render();
  assert.deepEqual(errors, ['effect: effect boom']);
  assert.equal(root.hooks[0].value, 5);
});
