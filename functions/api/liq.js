// /functions/api/liq.js — Cloudflare Pages Function port of the dead
// Vercel serverless function at api/liq.js (V10.7.79). Same logic, ported
// from Node's (req,res) handler shape to Cloudflare's onRequest(context)
// shape returning a Fetch API Response. See api/liq.js for the original
// history/comments.

const CACHE_TTL_MS = 15000;
let _cache = null;

const respond = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
});

const tryFetch = async (url, ms = 3000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 TaraApp/10.7.79', 'Accept': 'application/json' },
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
};

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return respond({ ..._cache.data, cached: true });

  let signal = 0;
  const reasons = [];
  const sources = [];

  // ── SOURCE 1: Coinbase vs Kraken premium ─────────────────────────────────
  try {
    const [cbR, krR] = await Promise.allSettled([
      tryFetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker', 2500).then(r => r.json()),
      tryFetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD', 2500).then(r => r.json()),
    ]);
    if (cbR.status === 'fulfilled' && krR.status === 'fulfilled') {
      const cb = parseFloat(cbR.value?.price || 0);
      const kr = parseFloat(krR.value?.result?.XXBTZUSD?.c?.[0] || 0);
      if (cb > 0 && kr > 0) {
        const premBps = ((cb - kr) / kr) * 10000;
        if (premBps > 15) { signal += 2; reasons.push(`CB +${premBps.toFixed(0)}bps premium (US buying)`); }
        else if (premBps < -15) { signal -= 2; reasons.push(`CB ${premBps.toFixed(0)}bps discount (US selling)`); }
        sources.push(`cb-kr-spread:${premBps.toFixed(0)}bps`);
      }
    }
  } catch (_) {}

  // ── SOURCE 2: Deribit BTC-PERPETUAL funding ───────────────────────────────
  try {
    const r = await tryFetch('https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL', 3000);
    const d = await r.json();
    const ticker = d?.result;
    if (ticker) {
      const funding8h = parseFloat(ticker.funding_8h || 0) * 100;
      if (funding8h > 0.06) {
        signal -= 3;
        reasons.push(`Deribit funding ${funding8h.toFixed(3)}% (longs overextended)`);
      } else if (funding8h < -0.04) {
        signal += 3;
        reasons.push(`Deribit funding ${funding8h.toFixed(3)}% (shorts overextended)`);
      } else if (funding8h > 0.03) {
        signal -= 1.5;
        reasons.push(`Deribit funding ${funding8h.toFixed(3)}% (mild long overload)`);
      } else if (funding8h < -0.02) {
        signal += 1.5;
        reasons.push(`Deribit funding ${funding8h.toFixed(3)}% (mild short overload)`);
      }
      sources.push('deribit-funding');
    }
  } catch (_) {}

  // ── SOURCE 3: Kraken order book imbalance ────────────────────────────────
  try {
    const r = await tryFetch('https://api.kraken.com/0/public/Depth?pair=XXBTZUSD&count=20', 2500);
    const d = await r.json();
    const pair = d?.result?.XXBTZUSD || d?.result?.XBTUSD;
    if (pair) {
      const bidVol = (pair.bids || []).slice(0, 10).reduce((s, [, q]) => s + parseFloat(q), 0);
      const askVol = (pair.asks || []).slice(0, 10).reduce((s, [, q]) => s + parseFloat(q), 0);
      const total = bidVol + askVol;
      if (total > 0) {
        const imbalance = (bidVol - askVol) / total;
        if (Math.abs(imbalance) > 0.1) {
          signal += imbalance * 2;
          reasons.push(`Kraken book ${imbalance > 0 ? 'bid' : 'ask'} heavy (${(imbalance * 100).toFixed(0)}%)`);
        }
        sources.push('kraken-book');
      }
    }
  } catch (_) {}

  signal = Math.max(-8, Math.min(8, Math.round(signal * 10) / 10));

  const result = {
    ok: sources.length > 0,
    signal: signal,
    direction: signal > 1 ? 'bullish' : signal < -1 ? 'bearish' : 'neutral',
    reasons,
    sources,
    fetchedAt: Date.now(),
  };

  if (result.ok) _cache = { at: Date.now(), data: result };
  return respond(result);
}
