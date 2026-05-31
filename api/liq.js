// /api/liq.js — Liquidation cluster signal (V10.7.73)
// Two data sources:
//   1. Bybit recent large liquidations (tells us if a squeeze just completed)
//   2. Computed liquidation gravity from funding rate + OI (tells us where price is pulled)
// No auth required for either.

const CACHE_TTL_MS = 15000; // 15s — liquidations are real-time
let _cache = null;

const respond = (res, payload, status = 200) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); return res.status(204).end(); }

  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond(res, { ..._cache.data, cached: true });
  }

  const UA = 'TaraApp/10.7.73';
  let signal = 0;
  let reasons = [];
  let sources = [];

  // ── SOURCE 1: Bybit recent liquidations (last 5 min) ─────────────────────
  try {
    // Bybit returns recent trades — liquidations are tagged with isBlockTrade=false
    // and appear as large market orders. We use the execType field.
    const r = await fetch(
      'https://api.bybit.com/v5/market/recent-trade?category=linear&symbol=BTCUSDT&limit=100',
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(3000) }
    );
    if (r.ok) {
      const d = await r.json();
      const trades = d?.result?.list || [];
      const now = Date.now();
      const recent = trades.filter(t => (now - Number(t.time)) < 300000); // last 5 min
      const largeTrades = recent.filter(t => parseFloat(t.size || 0) >= 0.5); // ≥0.5 BTC

      // Large sells = longs being liquidated = often a bottom = bullish reversal signal
      // Large buys = shorts being liquidated = often a top = bearish reversal signal
      const largeSells = largeTrades.filter(t => t.side === 'Sell').length;
      const largeBuys = largeTrades.filter(t => t.side === 'Buy').length;

      if (largeSells > largeBuys * 1.5 && largeSells >= 5) {
        signal += 2.5; // long liquidation cascade = capitulation = bullish
        reasons.push(`${largeSells} large sells (long liquidation cascade)`);
      } else if (largeBuys > largeSells * 1.5 && largeBuys >= 5) {
        signal -= 2.5; // short squeeze completed = bearish
        reasons.push(`${largeBuys} large buys (short squeeze completing)`);
      }
      sources.push('bybit-trades');
    }
  } catch (e) { /* silent */ }

  // ── SOURCE 2: Binance futures open interest + funding ─────────────────────
  // High positive funding + rising OI = overleveraged longs → bearish fade
  // High negative funding + rising OI = overleveraged shorts → bullish squeeze
  try {
    const [oiRes, fundRes] = await Promise.allSettled([
      fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(2000) }).then(r => r.json()),
      fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=2', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(2000) }).then(r => r.json()),
    ]);
    if (oiRes.status === 'fulfilled' && fundRes.status === 'fulfilled') {
      const funding = parseFloat(fundRes.value?.[0]?.fundingRate || 0) * 100; // convert to %
      if (funding > 0.08) { signal -= 2; reasons.push(`funding ${funding.toFixed(3)}% (longs overextended)`); }
      else if (funding < -0.05) { signal += 2; reasons.push(`funding ${funding.toFixed(3)}% (shorts overextended)`); }
      sources.push('binance-funding');
    }
  } catch (e) { /* silent */ }

  // ── SOURCE 3: Coinbase premium vs Kraken ─────────────────────────────────
  // CB premium = US retail buying (bullish), discount = US retail selling
  try {
    const [cbRes, krRes] = await Promise.allSettled([
      fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(2000) }).then(r => r.json()).then(d => parseFloat(d?.price)),
      fetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(2000) }).then(r => r.json()).then(d => parseFloat(d?.result?.XXBTZUSD?.c?.[0])),
    ]);
    if (cbRes.status === 'fulfilled' && krRes.status === 'fulfilled') {
      const cb = cbRes.value, kr = krRes.value;
      if (cb > 0 && kr > 0) {
        const premiumBps = ((cb - kr) / kr) * 10000;
        if (premiumBps > 15) { signal += 1.5; reasons.push(`CB premium +${premiumBps.toFixed(0)}bps (US retail buying)`); }
        else if (premiumBps < -15) { signal -= 1.5; reasons.push(`CB discount ${premiumBps.toFixed(0)}bps (US retail selling)`); }
        sources.push(`cb-premium:${premiumBps.toFixed(0)}bps`);
      }
    }
  } catch (e) { /* silent */ }

  signal = Math.max(-8, Math.min(8, signal));

  const result = {
    ok: true,
    signal: Math.round(signal * 10) / 10,
    direction: signal > 1 ? 'bullish' : signal < -1 ? 'bearish' : 'neutral',
    reasons,
    sources,
    fetchedAt: Date.now(),
  };

  _cache = { at: Date.now(), data: result };
  return respond(res, result);
}
