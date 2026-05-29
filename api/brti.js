// /api/brti.js — Vercel serverless function (V10.7.65b)
// Standard serverless (NOT Edge Runtime) — avoids burning Edge Request quota.
// Server-side BRTI: 4 CF Benchmarks constituent exchanges, trimmed mean.
// CF Benchmarks official API requires paid key — using 4 of 6 constituents instead.

const CACHE_TTL_MS = 1500; // 1.5s — matches Tara's poll cadence
let _cache = null;

const tryFetch = async (url, timeoutMs = 2500) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 TaraApp/10.7.65b',
        'Accept': 'application/json',
      },
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
};

const respond = (res, payload, status = 200) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(204).end();
  }

  // Server-side cache — 1.5s TTL matches Tara's poll rate
  // Prevents multiple simultaneous renders from each making their own requests
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond(res, { ..._cache.data, cached: true });
  }

  // 4 of 6 CF Benchmarks constituent exchanges (all public, no auth)
  const [cb, kr, gem, bs] = await Promise.allSettled([
    tryFetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker')
      .then(r => r.json()).then(d => ({ name: 'CB', price: parseFloat(d?.price) })),
    tryFetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD')
      .then(r => r.json()).then(d => ({ name: 'KR', price: parseFloat(d?.result?.XXBTZUSD?.c?.[0]) })),
    tryFetch('https://api.gemini.com/v1/pubticker/btcusd')
      .then(r => r.json()).then(d => ({ name: 'GEM', price: parseFloat(d?.last) })),
    tryFetch('https://www.bitstamp.net/api/v2/ticker/btcusd/')
      .then(r => r.json()).then(d => ({ name: 'BS', price: parseFloat(d?.last) })),
  ]);

  const valid = [cb, kr, gem, bs]
    .filter(r => r.status === 'fulfilled' && Number.isFinite(r.value?.price) && r.value.price > 10000)
    .map(r => r.value)
    .sort((a, b) => a.price - b.price);

  if (valid.length < 2) {
    return respond(res, {
      ok: false,
      error: 'Fewer than 2 sources responded',
      fetchedAt: Date.now(),
    }, 503);
  }

  // Trimmed mean: drop min+max if ≥3 sources
  const trimmed = valid.length >= 3 ? valid.slice(1, -1) : valid;
  const price = trimmed.reduce((s, x) => s + x.price, 0) / trimmed.length;

  const result = {
    ok: true,
    price: Math.round(price * 100) / 100,
    source: valid.length === 4 ? 'constituent-4of6' : `constituent-${valid.length}of6`,
    sources: valid.map(x => x.name),
    prices: Object.fromEntries(valid.map(x => [x.name, Math.round(x.price * 100) / 100])),
    fetchedAt: Date.now(),
  };

  _cache = { at: Date.now(), data: result };
  return respond(res, result);
}
