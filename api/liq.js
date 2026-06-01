// /api/liq.js — Liquidation + CB premium + funding signal (V10.7.79)
// Rebuilt with Vercel-accessible sources only (same as coinglass.js).
// Bybit/Binance futures block Vercel IPs — using Coinbase, Kraken, Deribit instead.
//
// Three sub-signals:
//   1. CB/Kraken premium — US retail direction (already works in prod)
//   2. Deribit BTC-PERP funding — overleveraged signal
//   3. Kraken top-of-book imbalance — directional pressure

const CACHE_TTL_MS = 15000;
let _cache = null;

const respond = (res, payload, status = 200) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); return res.status(204).end(); }
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return respond(res, { ..._cache.data, cached: true });

  let signal = 0;
  const reasons = [];
  const sources = [];

  // ── SOURCE 1: Coinbase vs Kraken premium ─────────────────────────────────
  // CB premium = US retail buying (bullish), discount = US retail selling
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
  // Positive funding = longs paying = over-leveraged longs = bearish fade
  // Negative funding = shorts paying = over-leveraged shorts = bullish squeeze
  try {
    const r = await tryFetch('https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL', 3000);
    const d = await r.json();
    const ticker = d?.result;
    if (ticker) {
      const funding = parseFloat(ticker.current_funding || 0) * 100; // to %
      const funding8h = parseFloat(ticker.funding_8h || 0) * 100;
      // Use 8h funding for stability
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
  // Top-of-book bid/ask ratio → directional pressure
  try {
    const r = await tryFetch('https://api.kraken.com/0/public/Depth?pair=XXBTZUSD&count=20', 2500);
    const d = await r.json();
    const pair = d?.result?.XXBTZUSD || d?.result?.XBTUSD;
    if (pair) {
      const bidVol = (pair.bids || []).slice(0, 10).reduce((s, [, q]) => s + parseFloat(q), 0);
      const askVol = (pair.asks || []).slice(0, 10).reduce((s, [, q]) => s + parseFloat(q), 0);
      const total = bidVol + askVol;
      if (total > 0) {
        const imbalance = (bidVol - askVol) / total; // +1 = all bids, -1 = all asks
        if (Math.abs(imbalance) > 0.1) {
          signal += imbalance * 2; // ±2pt max from book imbalance
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
  return respond(res, result);
}
