// /api/coinglass.js — Coinglass liquidation heatmap + OI signal (V10.7.76)
// Two signals:
//   1. Liquidation gravity: where are the largest liquidation clusters relative
//      to current price? Price gets magnetically pulled toward these clusters.
//   2. OI change: is the current move backed by real accumulation (OI rising)
//      or just liquidation noise (OI dropping as price moves)?
//
// Coinglass public API — no key required for basic endpoints.

const CACHE_TTL_MS = 20000; // 20s
let _cache = null;

const respond = (res, payload, status = 200) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

const tryFetch = async (url, timeoutMs = 4000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 TaraApp/10.7.76',
        'Accept': 'application/json',
        'Origin': 'https://www.coinglass.com',
        'Referer': 'https://www.coinglass.com/',
      },
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(204).end();
  }

  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond(res, { ..._cache.data, cached: true });
  }

  const result = {
    ok: false,
    liquidationGravity: 0,     // ±10: positive = pull UP (long clusters above), negative = pull DOWN
    gravityDirection: 'neutral',
    nearestWallSide: null,      // 'above' | 'below' | null
    nearestWallDistBps: null,   // how far in bps to nearest large wall
    nearestWallSize: null,      // USD value of nearest wall
    oiSignal: 0,                // ±5: positive = OI rising with price (real move), negative = OI dropping (liquidation noise)
    oiChangePercent: null,
    sources: [],
    fetchedAt: Date.now(),
  };

  // ── SOURCE 1: Bybit liquidation orders (real-time, shows active liq pressure) ──
  try {
    // Get current BTC price for reference
    const priceRes = await tryFetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT', 2000);
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData?.result?.list?.[0]?.lastPrice || 0);

    if (currentPrice > 0) {
      // Get orderbook to find large walls (proxy for liquidation clusters)
      const obRes = await tryFetch(`https://api.bybit.com/v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=50`, 3000);
      const obData = await obRes.json();
      const bids = obData?.result?.b || [];
      const asks = obData?.result?.a || [];

      // Find large walls within 2% of current price
      const WALL_THRESHOLD_USD = 5000000; // $5M+ = significant wall
      const RANGE_PCT = 0.02; // look within 2%

      let largestAbove = { price: 0, size: 0 };
      let largestBelow = { price: 0, size: 0 };

      asks.forEach(([price, qty]) => {
        const p = parseFloat(price), q = parseFloat(qty);
        const distPct = (p - currentPrice) / currentPrice;
        if (distPct > 0 && distPct < RANGE_PCT) {
          const usdSize = p * q;
          if (usdSize > largestAbove.size) largestAbove = { price: p, size: usdSize };
        }
      });

      bids.forEach(([price, qty]) => {
        const p = parseFloat(price), q = parseFloat(qty);
        const distPct = (currentPrice - p) / currentPrice;
        if (distPct > 0 && distPct < RANGE_PCT) {
          const usdSize = p * q;
          if (usdSize > largestBelow.size) largestBelow = { price: p, size: usdSize };
        }
      });

      // Compute gravity: bigger wall above = price pulled up, bigger wall below = pulled down
      const aboveMagnitude = Math.min(1, largestAbove.size / 20000000); // normalize to $20M
      const belowMagnitude = Math.min(1, largestBelow.size / 20000000);
      const gravityScore = (aboveMagnitude - belowMagnitude) * 8; // ±8

      result.liquidationGravity = Math.round(gravityScore * 10) / 10;
      result.gravityDirection = gravityScore > 1 ? 'up' : gravityScore < -1 ? 'down' : 'neutral';

      // Nearest wall
      const aboveDistBps = largestAbove.size > WALL_THRESHOLD_USD
        ? Math.round(((largestAbove.price - currentPrice) / currentPrice) * 10000)
        : null;
      const belowDistBps = largestBelow.size > WALL_THRESHOLD_USD
        ? Math.round(((currentPrice - largestBelow.price) / currentPrice) * 10000)
        : null;

      if (aboveDistBps !== null && (belowDistBps === null || aboveDistBps < belowDistBps)) {
        result.nearestWallSide = 'above';
        result.nearestWallDistBps = aboveDistBps;
        result.nearestWallSize = Math.round(largestAbove.size / 1000000 * 10) / 10; // in $M
      } else if (belowDistBps !== null) {
        result.nearestWallSide = 'below';
        result.nearestWallDistBps = belowDistBps;
        result.nearestWallSize = Math.round(largestBelow.size / 1000000 * 10) / 10;
      }

      result.sources.push('bybit-orderbook');
    }
  } catch (e) { /* silent */ }

  // ── SOURCE 2: Binance futures OI change (real accumulation vs noise) ────────
  try {
    // Get OI history for last 2 periods (5min each)
    const oiRes = await tryFetch(
      'https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=5m&limit=4',
      3000
    );
    const oiData = await oiRes.json();
    if (Array.isArray(oiData) && oiData.length >= 3) {
      // Compare recent OI to earlier OI
      const recentOI = parseFloat(oiData[oiData.length - 1]?.sumOpenInterest || 0);
      const olderOI = parseFloat(oiData[0]?.sumOpenInterest || 0);
      if (olderOI > 0) {
        const oiChangePct = ((recentOI - olderOI) / olderOI) * 100;
        result.oiChangePercent = Math.round(oiChangePct * 100) / 100;

        // OI rising = real accumulation (move has legs)
        // OI falling = liquidation-driven (move will fade)
        if (oiChangePct > 0.5) result.oiSignal = Math.min(5, oiChangePct * 2);
        else if (oiChangePct < -0.5) result.oiSignal = Math.max(-5, oiChangePct * 2);
        result.oiSignal = Math.round(result.oiSignal * 10) / 10;

        result.sources.push('binance-oi');
      }
    }
  } catch (e) { /* silent */ }

  result.ok = result.sources.length > 0;

  // Combined signal
  const combined = result.liquidationGravity + result.oiSignal;
  result.combinedSignal = Math.max(-10, Math.min(10, Math.round(combined * 10) / 10));
  result.combinedDirection = combined > 1.5 ? 'bullish' : combined < -1.5 ? 'bearish' : 'neutral';

  if (result.ok) {
    _cache = { at: Date.now(), data: result };
  }

  return respond(res, result);
}
