// /api/whale.js — Vercel Edge Function
// V10.7.65 — Whale Alert on-chain signal
// Requires WHALE_ALERT_API_KEY environment variable in Vercel dashboard
// Free tier: 10 req/min, tracks transactions >$500K
// Register at: https://whale-alert.io (free, no credit card)

export const config = { runtime: 'edge' };

const CACHE = { data: null, ts: 0 };
const CACHE_TTL = 30000; // 30s cache

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  // Return cached if fresh
  if (CACHE.data && Date.now() - CACHE.ts < CACHE_TTL) {
    return new Response(JSON.stringify(CACHE.data), { status: 200, headers });
  }

  const API_KEY = process.env.WHALE_ALERT_API_KEY;
  if (!API_KEY) {
    return new Response(JSON.stringify({
      ok: false, error: 'WHALE_ALERT_API_KEY not set in Vercel environment variables',
      setup: 'Add WHALE_ALERT_API_KEY to your Vercel project settings → Environment Variables'
    }), { status: 503, headers });
  }

  try {
    const since = Math.floor((Date.now() - 300000) / 1000); // last 5 min
    const r = await fetch(
      `https://api.whale-alert.io/v1/transactions?api_key=${API_KEY}&min_value=500000&start=${since}&limit=20`,
      { headers: { 'User-Agent': 'TaraApp/10.7.65' }, signal: AbortSignal.timeout(3000) }
    );

    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, error: `Whale Alert ${r.status}` }), { status: 503, headers });
    }

    const d = await r.json();
    const txs = (d?.transactions || []).filter(t => t.symbol === 'btc' || t.symbol === 'eth');

    // Classify direction: exchange_inflow = sell pressure, exchange_outflow = buy pressure
    const signals = txs.map(t => {
      const fromExchange = t.from?.owner_type === 'exchange';
      const toExchange = t.to?.owner_type === 'exchange';
      const fromLabel = t.from?.owner || t.from?.owner_type || 'unknown';
      const toLabel = t.to?.owner || t.to?.owner_type || 'unknown';
      let direction = 'neutral';
      if (toExchange && !fromExchange) direction = 'bearish'; // moving TO exchange = likely sell
      if (fromExchange && !toExchange) direction = 'bullish'; // moving FROM exchange = likely buy/hold
      return {
        id: t.id,
        symbol: t.symbol?.toUpperCase(),
        valueUsd: t.amount_usd,
        direction,
        fromLabel,
        toLabel,
        ageSeconds: Math.floor(Date.now()/1000 - t.timestamp),
        blockchain: t.blockchain,
      };
    });

    // Aggregate: net pressure score for BTC (-10 to +10)
    const btcSignals = signals.filter(s => s.symbol === 'BTC');
    let netScore = 0;
    btcSignals.forEach(s => {
      const weight = Math.min(1, s.valueUsd / 5000000); // $5M = full weight
      if (s.direction === 'bullish') netScore += weight * 3;
      else if (s.direction === 'bearish') netScore -= weight * 3;
    });
    netScore = Math.max(-10, Math.min(10, netScore));

    const result = {
      ok: true,
      netScore: Math.round(netScore * 10) / 10,
      direction: netScore > 1.5 ? 'bullish' : netScore < -1.5 ? 'bearish' : 'neutral',
      transactionCount: btcSignals.length,
      transactions: signals.slice(0, 10),
      fetchedAt: Date.now(),
    };

    CACHE.data = result;
    CACHE.ts = Date.now();
    return new Response(JSON.stringify(result), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 503, headers });
  }
}
