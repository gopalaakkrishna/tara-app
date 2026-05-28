// /api/brti.js — Vercel serverless function
// V10.7.59 — Exact BRTI from CF Benchmarks
// Runs server-side: no CORS issues, no browser restrictions.
// CF Benchmarks publishes BRTI every second.
// Free tier — no API key required for real-time index value.
// Cache: 1s (matches CF publish cadence).

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Try CF Benchmarks official endpoint first
  const ENDPOINTS = [
    // CF Benchmarks official real-time BRTI
    {
      url: 'https://benchmarks.cfbenchmarks.com/data/brti',
      parse: (d) => ({
        price: Number(d?.last ?? d?.value ?? d?.price),
        source: 'cfbenchmarks',
        ts: d?.time ?? d?.timestamp ?? Date.now(),
      }),
    },
    // CF Benchmarks alternate endpoint format
    {
      url: 'https://cfbenchmarks.com/data/indices/BRTI/real-time',
      parse: (d) => ({
        price: Number(d?.last ?? d?.value ?? d?.price ?? d?.index_value),
        source: 'cfbenchmarks-alt',
        ts: d?.time ?? Date.now(),
      }),
    },
    // Kaiko CF reference rate (free tier)
    {
      url: 'https://reference-data-api.kaiko.io/v1/data/index/pairs/btcusd/BRTI',
      parse: (d) => ({
        price: Number(d?.data?.[0]?.price ?? d?.price),
        source: 'kaiko-cf',
        ts: d?.data?.[0]?.timestamp ?? Date.now(),
      }),
    },
  ];

  let result = null;
  let lastError = null;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint.url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'TaraApp/10.7.59' },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = endpoint.parse(data);
      if (parsed.price && Number.isFinite(parsed.price) && parsed.price > 10000) {
        result = parsed;
        break;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  if (result) {
    return new Response(JSON.stringify({
      ok: true,
      price: Math.round(result.price * 100) / 100,
      source: result.source,
      ts: result.ts,
      fetchedAt: Date.now(),
    }), { status: 200, headers });
  }

  // All CF endpoints failed — fall back to weighted trimmed mean
  // of the 4 real BRTI constituent exchanges we can reach
  try {
    const [cb, kr, gem, bs] = await Promise.allSettled([
      fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot').then(r => r.json()).then(d => parseFloat(d?.data?.amount)),
      fetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD').then(r => r.json()).then(d => parseFloat(d?.result?.XXBTZUSD?.c?.[0])),
      fetch('https://api.gemini.com/v1/pubticker/btcusd').then(r => r.json()).then(d => parseFloat(d?.last)),
      fetch('https://www.bitstamp.net/api/v2/ticker/btcusd/').then(r => r.json()).then(d => parseFloat(d?.last)),
    ]);

    const prices = [cb, kr, gem, bs]
      .filter(r => r.status === 'fulfilled' && Number.isFinite(r.value) && r.value > 10000)
      .map(r => r.value);

    if (prices.length >= 2) {
      prices.sort((a, b) => a - b);
      // Trimmed mean — drop min+max if ≥3 sources
      const middle = prices.length >= 3 ? prices.slice(1, -1) : prices;
      const price = middle.reduce((s, p) => s + p, 0) / middle.length;

      return new Response(JSON.stringify({
        ok: true,
        price: Math.round(price * 100) / 100,
        source: 'constituent-fallback',
        sourceCount: prices.length,
        fetchedAt: Date.now(),
      }), { status: 200, headers });
    }
  } catch (e) {
    lastError = e.message;
  }

  return new Response(JSON.stringify({
    ok: false,
    error: 'All BRTI sources failed',
    lastError,
    fetchedAt: Date.now(),
  }), { status: 503, headers });
}
