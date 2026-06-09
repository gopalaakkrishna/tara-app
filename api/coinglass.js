// /api/coinglass.js — Liquidation gravity + OI signal (V10.7.76b)
// Rebuilt with Vercel-accessible sources only.
// Bybit futures OB + Binance futures OI were blocking Vercel IPs.
// New approach: compute liquidation gravity from sources we know work:
//   1. Coinbase + Kraken price spread → CB premium (directional)
//   2. Coinbase order book (level 2) → wall detection near price
//   3. Deribit BTC-PERP open interest → OI proxy signal
//   4. Kraken futures (accessible from Vercel) → OI + funding

const CACHE_TTL_MS = 20000;
let _cache = null;

const respond = (res, payload, status = 200) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

const tryFetch = async (url, timeoutMs = 3500) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 TaraApp/10.7.76b', 'Accept': 'application/json' },
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); return res.status(204).end(); }
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return respond(res, { ..._cache.data, cached: true });

  const result = {
    ok: false,
    liquidationGravity: 0,
    gravityDirection: 'neutral',
    nearestWallSide: null,
    nearestWallDistBps: null,
    nearestWallSize: null,
    oiSignal: 0,
    oiChangePercent: null,
    combinedSignal: 0,
    combinedDirection: 'neutral',
    sources: [],
    fetchedAt: Date.now(),
  };

  // ── SOURCE 1: Coinbase order book — wall detection ─────────────────────
  // Coinbase level 2 book is accessible from Vercel (used in brti.js)
  // Shows large bid/ask walls that act as support/resistance/liquidation magnets
  try {
    const [cbTickerRes, cbBookRes] = await Promise.allSettled([
      tryFetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker', 2500).then(r => r.json()),
      tryFetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2', 3000).then(r => r.json()),
    ]);

    const currentPrice = cbTickerRes.status === 'fulfilled' ? parseFloat(cbTickerRes.value?.price || 0) : 0;

    if (currentPrice > 0 && cbBookRes.status === 'fulfilled') {
      const book = cbBookRes.value;
      const bids = book?.bids || [];
      const asks = book?.asks || [];

      const WALL_MIN_BTC = 5; // V10.8.6: 10→5 BTC (~$350K). Was too strict, gravity populated 1/100.
      const RANGE_PCT = 0.025; // V10.8.6: 1.5%→2.5% scan range — catch walls a 15m window can reach

      let largestAbove = { price: 0, btc: 0 };
      let largestBelow = { price: 0, btc: 0 };
      let totalAskBtc = 0, totalBidBtc = 0;

      asks.forEach(([price, qty]) => {
        const p = parseFloat(price), q = parseFloat(qty);
        const distPct = (p - currentPrice) / currentPrice;
        totalAskBtc += q;
        if (distPct > 0 && distPct < RANGE_PCT && q > largestAbove.btc) {
          largestAbove = { price: p, btc: q };
        }
      });

      bids.forEach(([price, qty]) => {
        const p = parseFloat(price), q = parseFloat(qty);
        const distPct = (currentPrice - p) / currentPrice;
        totalBidBtc += q;
        if (distPct > 0 && distPct < RANGE_PCT && q > largestBelow.btc) {
          largestBelow = { price: p, btc: q };
        }
      });

      // Bid/ask imbalance → directional pressure
      const totalBook = totalAskBtc + totalBidBtc;
      const bidImbalance = totalBook > 0 ? (totalBidBtc - totalAskBtc) / totalBook : 0;
      // Positive bidImbalance = more bids = bullish pressure
      result.liquidationGravity += bidImbalance * 5; // ±2.5pt from book imbalance

      // Nearest large wall
      const aboveSizeUSD = largestAbove.btc * largestAbove.price;
      const belowSizeUSD = largestBelow.btc * largestBelow.price;
      const WALL_USD_MIN = 350000; // V10.8.6: $700K→$350K to match WALL_MIN_BTC=5

      const aboveDistBps = aboveSizeUSD > WALL_USD_MIN
        ? Math.round(((largestAbove.price - currentPrice) / currentPrice) * 10000) : null;
      const belowDistBps = belowSizeUSD > WALL_USD_MIN
        ? Math.round(((currentPrice - largestBelow.price) / currentPrice) * 10000) : null;

      if (aboveDistBps !== null && (belowDistBps === null || aboveDistBps < belowDistBps)) {
        result.nearestWallSide = 'above';
        result.nearestWallDistBps = aboveDistBps;
        result.nearestWallSize = Math.round(aboveSizeUSD / 100000) / 10;
        // Wall above = price attracted upward = bullish pull. V10.8.6: scale to $350K base.
        const gravity = Math.min(4, (aboveSizeUSD / WALL_USD_MIN) * (1 / Math.max(aboveDistBps / 60, 1)));
        result.liquidationGravity += gravity;
      } else if (belowDistBps !== null) {
        result.nearestWallSide = 'below';
        result.nearestWallDistBps = belowDistBps;
        result.nearestWallSize = Math.round(belowSizeUSD / 100000) / 10;
        const gravity = Math.min(4, (belowSizeUSD / WALL_USD_MIN) * (1 / Math.max(belowDistBps / 60, 1)));
        result.liquidationGravity -= gravity;
      }

      result.sources.push('coinbase-book');
    }
  } catch (e) { /* silent */ }

  // ── SOURCE 2: Deribit BTC-PERPETUAL — OI proxy ─────────────────────────
  // Deribit perp OI changes track the same institutional flow as Binance
  try {
    const [perpNow, perpHist] = await Promise.allSettled([
      tryFetch('https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL', 2500).then(r => r.json()),
      tryFetch('https://www.deribit.com/api/v2/public/get_funding_chart_data?instrument_name=BTC-PERPETUAL&length=8h', 2500).then(r => r.json()),
    ]);

    if (perpNow.status === 'fulfilled') {
      const ticker = perpNow.value?.result;
      if (ticker) {
        // Funding rate: positive = longs paying = overleveraged longs = bearish fade
        const funding = parseFloat(ticker.current_funding || ticker.funding_8h || 0);
        if (funding > 0.0008) { result.oiSignal -= 2; } // longs overextended
        else if (funding < -0.0005) { result.oiSignal += 2; } // shorts overextended

        // Open interest change from stats
        const oi = parseFloat(ticker.open_interest || 0);
        if (oi > 0) {
          // Store in cache for delta next call
          if (_cache?.prevOI && _cache.prevOI > 0) {
            const oiDeltaPct = ((oi - _cache.prevOI) / _cache.prevOI) * 100;
            result.oiChangePercent = Math.round(oiDeltaPct * 100) / 100;
            if (oiDeltaPct > 0.3) result.oiSignal += Math.min(3, oiDeltaPct * 3);
            else if (oiDeltaPct < -0.3) result.oiSignal += Math.max(-3, oiDeltaPct * 3);
          }
          result._currentOI = oi;
        }
        result.sources.push('deribit-perp');
      }
    }
  } catch (e) { /* silent */ }

  // ── SOURCE 3: Kraken spot order book — second wall check ───────────────
  try {
    const krRes = await tryFetch('https://api.kraken.com/0/public/Depth?pair=XXBTZUSD&count=25', 2500);
    const krData = await krRes.json();
    const pair = krData?.result?.XXBTZUSD || krData?.result?.XBTUSD;
    if (pair) {
      const asks = pair.asks || [];
      const bids = pair.bids || [];
      // Quick bid/ask volume comparison near top of book
      const topAskVol = asks.slice(0, 10).reduce((s, [, q]) => s + parseFloat(q), 0);
      const topBidVol = bids.slice(0, 10).reduce((s, [, q]) => s + parseFloat(q), 0);
      const krImbalance = (topBidVol - topAskVol) / Math.max(topBidVol + topAskVol, 1);
      result.liquidationGravity += krImbalance * 2; // ±1pt from Kraken book
      result.sources.push('kraken-book');
    }
  } catch (e) { /* silent */ }

  // Clamp and finalize
  result.liquidationGravity = Math.max(-8, Math.min(8, Math.round(result.liquidationGravity * 10) / 10));
  result.oiSignal = Math.max(-5, Math.min(5, Math.round(result.oiSignal * 10) / 10));
  result.gravityDirection = result.liquidationGravity > 1 ? 'up' : result.liquidationGravity < -1 ? 'down' : 'neutral';

  const combined = result.liquidationGravity + result.oiSignal;
  result.combinedSignal = Math.max(-10, Math.min(10, Math.round(combined * 10) / 10));
  result.combinedDirection = combined > 1.5 ? 'bullish' : combined < -1.5 ? 'bearish' : 'neutral';
  result.ok = result.sources.length > 0;

  if (result.ok) {
    _cache = { at: Date.now(), data: result, prevOI: result._currentOI || _cache?.prevOI };
  }
  return respond(res, result);
}
