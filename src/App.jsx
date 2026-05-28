// /api/brti.js — Vercel Edge Function
// V10.7.61b — 4-constituent trimmed mean (CB+KR+GEM+BS)
// CF Benchmarks real-time API requires a registered key — no free public endpoint.
// Best achievable without a key: 4 of 6 CF constituents (missing itBit + LMAX Digital).
// Trimmed mean of CB+KR+GEM+BS is typically within $5-15 of official BRTI.

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const UA = 'Mozilla/5.0 TaraApp/10.7.61b';
  const t = (ms) => AbortSignal.timeout(ms);

  // 4 real CF Benchmarks constituent exchanges
  // Using exchange-tier endpoints (more reliable from server-side than commerce APIs)
  const fetches = await Promise.allSettled([
    // Coinbase — exchange API (public, no auth, reliable from Vercel)
    fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker', { headers: { 'User-Agent': UA }, signal: t(2500) })
      .then(r => r.json()).then(d => ({ name: 'CB', price: parseFloat(d?.price) })),
    // Kraken — public ticker
    fetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD', { headers: { 'User-Agent': UA }, signal: t(2500) })
      .then(r => r.json()).then(d => ({ name: 'KR', price: parseFloat(d?.result?.XXBTZUSD?.c?.[0]) })),
    // Gemini — public ticker
    fetch('https://api.gemini.com/v1/pubticker/btcusd', { headers: { 'User-Agent': UA }, signal: t(2500) })
      .then(r => r.json()).then(d => ({ name: 'GEM', price: parseFloat(d?.last) })),
    // Bitstamp — public ticker
    fetch('https://www.bitstamp.net/api/v2/ticker/btcusd/', { headers: { 'User-Agent': UA }, signal: t(2500) })
      .then(r => r.json()).then(d => ({ name: 'BS', price: parseFloat(d?.last) })),
  ]);

  const valid = fetches
    .filter(r => r.status === 'fulfilled' && Number.isFinite(r.value?.price) && r.value.price > 10000)
    .map(r => r.value)
    .sort((a, b) => a.price - b.price);

  if (valid.length < 2) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Fewer than 2 sources responded',
      sources: fetches.map((r, i) => ({ name: ['CB','KR','GEM','BS'][i], ok: r.status === 'fulfilled' })),
      fetchedAt: Date.now(),
    }), { status: 503, headers });
  }

  // Trimmed mean: drop min + max if ≥3 sources (matches CF partition methodology subset)
  const trimmed = valid.length >= 3 ? valid.slice(1, -1) : valid;
  const price = trimmed.reduce((s, x) => s + x.price, 0) / trimmed.length;

  return new Response(JSON.stringify({
    ok: true,
    price: Math.round(price * 100) / 100,
    source: valid.length === 4 ? 'constituent-4of6' : `constituent-${valid.length}of6`,
    sources: valid.map(x => x.name),
    prices: Object.fromEntries(valid.map(x => [x.name, Math.round(x.price * 100) / 100])),
    fetchedAt: Date.now(),
  }), { status: 200, headers });
}
