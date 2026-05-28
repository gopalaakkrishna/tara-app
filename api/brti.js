// /api/brti.js — Vercel Edge Function
// V10.7.61 — Exact BRTI from CF Benchmarks, server-side (no CORS)
// Deploy: place this file in /api/brti.js in your Vercel project root
// Usage: fetch('/api/brti') → { ok: true, price: 76432.50, source: 'cfbenchmarks' }

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

  const UA = 'TaraApp/10.7.61';
  let lastError = null;

  // ── TIER 1: CF Benchmarks official endpoints ──────────────────────────────
  const CF_ENDPOINTS = [
    // Primary: CF Benchmarks real-time data API
    {
      url: 'https://benchmarks.cfbenchmarks.com/data/brti',
      parse: (d) => ({ price: Number(d?.last ?? d?.value ?? d?.price ?? d?.index_value), source: 'cfbenchmarks' }),
    },
    // Alternate CF format
    {
      url: 'https://benchmarks.cfbenchmarks.com/data/historical?id=BRTI&type=last',
      parse: (d) => ({
        price: Number(Array.isArray(d) ? d[d.length-1]?.value : d?.last ?? d?.value),
        source: 'cfbenchmarks-hist',
      }),
    },
    // Kaiko publishes CF reference rates (free tier, no auth)
    {
      url: 'https://reference-data-api.kaiko.io/v1/data/index/pairs/btcusd/BRTI',
      parse: (d) => ({ price: Number(d?.data?.[0]?.price ?? d?.price ?? d?.last), source: 'kaiko-brti' }),
    },
  ];

  for (const ep of CF_ENDPOINTS) {
    try {
      const res = await fetch(ep.url, {
        headers: { Accept: 'application/json', 'User-Agent': UA },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) { lastError = `${ep.url} → ${res.status}`; continue; }
      const data = await res.json();
      const { price, source } = ep.parse(data);
      if (price && Number.isFinite(price) && price > 10000) {
        return new Response(JSON.stringify({ ok: true, price: Math.round(price * 100) / 100, source, fetchedAt: Date.now() }), { status: 200, headers });
      }
    } catch (e) { lastError = e.message; }
  }

  // ── TIER 2: 4 actual CF Benchmarks constituent exchanges ─────────────────
  // CB, Kraken, Gemini, Bitstamp — the 4 we can reach without auth
  // Trimmed mean matches CF's partition methodology on this subset
  try {
    const [cb, kr, gem, bs] = await Promise.allSettled([
      fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { headers: { 'User-Agent': UA } })
        .then(r => r.json()).then(d => parseFloat(d?.data?.amount)),
      fetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD', { headers: { 'User-Agent': UA } })
        .then(r => r.json()).then(d => parseFloat(d?.result?.XXBTZUSD?.c?.[0])),
      fetch('https://api.gemini.com/v1/pubticker/btcusd', { headers: { 'User-Agent': UA } })
        .then(r => r.json()).then(d => parseFloat(d?.last)),
      fetch('https://www.bitstamp.net/api/v2/ticker/btcusd/', { headers: { 'User-Agent': UA } })
        .then(r => r.json()).then(d => parseFloat(d?.last)),
    ]);

    const prices = [cb, kr, gem, bs]
      .filter(r => r.status === 'fulfilled' && Number.isFinite(r.value) && r.value > 10000)
      .map(r => r.value)
      .sort((a, b) => a - b);

    if (prices.length >= 2) {
      const middle = prices.length >= 3 ? prices.slice(1, -1) : prices;
      const price = middle.reduce((s, p) => s + p, 0) / middle.length;
      return new Response(JSON.stringify({
        ok: true,
        price: Math.round(price * 100) / 100,
        source: 'constituent-fallback',
        sourceCount: prices.length,
        sources: ['CB','KR','GEM','BS'].filter((_,i) => [cb,kr,gem,bs][i]?.status === 'fulfilled'),
        fetchedAt: Date.now(),
      }), { status: 200, headers });
    }
  } catch (e) { lastError = e.message; }

  return new Response(JSON.stringify({ ok: false, error: 'All BRTI sources failed', lastError, fetchedAt: Date.now() }), { status: 503, headers });
}
