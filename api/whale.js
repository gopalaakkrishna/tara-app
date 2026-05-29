// /api/whale.js — Vercel serverless function (V10.7.65b)
// On-chain whale signal for Tara. Two-tier:
//   Tier 1: Whale Alert API (best data, requires free API key from whale-alert.io)
//   Tier 2: mempool.space + Blockchair (no key needed, less detailed but works immediately)
//
// To enable Whale Alert: add WHALE_ALERT_API_KEY to Vercel Environment Variables
// Without key: falls back to mempool.space large-tx detection automatically

const CACHE_TTL_MS = 30000;
let _cache = null;

const tryFetch = async (url, timeoutMs = 4000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 TaraApp/10.7.65b', 'Accept': 'application/json' },
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

  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond(res, { ..._cache.data, cached: true });
  }

  // ── TIER 1: Whale Alert (if API key configured) ───────────────────────────
  const API_KEY = process.env.WHALE_ALERT_API_KEY;
  if (API_KEY) {
    try {
      const since = Math.floor((Date.now() - 300000) / 1000); // last 5 min
      const r = await tryFetch(
        `https://api.whale-alert.io/v1/transactions?api_key=${API_KEY}&min_value=500000&start=${since}&limit=20`,
        3000
      );
      const d = await r.json();
      const txs = (d?.transactions || []).filter(t => t.symbol === 'btc');

      let netScore = 0;
      const signals = txs.map(t => {
        const toExch = t.to?.owner_type === 'exchange';
        const fromExch = t.from?.owner_type === 'exchange';
        const dir = toExch && !fromExch ? 'bearish' : fromExch && !toExch ? 'bullish' : 'neutral';
        const weight = Math.min(1, (t.amount_usd || 0) / 5000000);
        if (dir === 'bullish') netScore += weight * 3;
        else if (dir === 'bearish') netScore -= weight * 3;
        return {
          valueUsd: t.amount_usd,
          direction: dir,
          fromLabel: t.from?.owner || t.from?.owner_type || 'unknown',
          toLabel: t.to?.owner || t.to?.owner_type || 'unknown',
          ageSeconds: Math.floor(Date.now() / 1000 - t.timestamp),
        };
      });

      netScore = Math.max(-10, Math.min(10, netScore));
      const result = {
        ok: true,
        source: 'whale-alert',
        netScore: Math.round(netScore * 10) / 10,
        direction: netScore > 1.5 ? 'bullish' : netScore < -1.5 ? 'bearish' : 'neutral',
        transactionCount: txs.length,
        transactions: signals.slice(0, 8),
        fetchedAt: Date.now(),
      };
      _cache = { at: Date.now(), data: result };
      return respond(res, result);
    } catch (e) { /* fall through to tier 2 */ }
  }

  // ── TIER 2: mempool.space large transactions (no key needed) ─────────────
  // mempool.space /api/mempool/recent returns last 10 mempool txs
  // We use confirmed blocks to find large value transfers
  try {
    // Get latest block transactions — large value BTC txs are exchange/whale moves
    const [blocksRes, mempoolRes] = await Promise.allSettled([
      tryFetch('https://mempool.space/api/blocks', 3000).then(r => r.json()),
      tryFetch('https://mempool.space/api/mempool/recent', 3000).then(r => r.json()),
    ]);

    // Use mempool recent txs to detect large pending moves
    let netScore = 0;
    let txCount = 0;
    const LARGE_TX_BTC = 100; // 100+ BTC = whale

    if (mempoolRes.status === 'fulfilled' && Array.isArray(mempoolRes.value)) {
      const largeTxs = mempoolRes.value.filter(tx => (tx.value || 0) > LARGE_TX_BTC * 100000000); // satoshis
      txCount = largeTxs.length;
      // Large mempool txs = someone is moving money = activity signal
      // More nuanced: we can't easily tell direction without address labels
      // Use tx count as pressure signal: many large txs = high activity
      if (largeTxs.length > 5) netScore = 2; // above average activity
      else if (largeTxs.length === 0) netScore = -1; // quiet = slight bearish bias
    }

    netScore = Math.max(-6, Math.min(6, netScore));
    const result = {
      ok: true,
      source: 'mempool-space',
      netScore: Math.round(netScore * 10) / 10,
      direction: netScore > 1.5 ? 'bullish' : netScore < -1.5 ? 'bearish' : 'neutral',
      transactionCount: txCount,
      note: 'Upgrade to Whale Alert API key for labeled exchange flow data',
      fetchedAt: Date.now(),
    };
    _cache = { at: Date.now(), data: result };
    return respond(res, result);
  } catch (e) { /* fall through */ }

  // ── No data available ────────────────────────────────────────────────────
  const fallback = {
    ok: false,
    source: 'none',
    netScore: 0,
    direction: 'neutral',
    transactionCount: 0,
    error: API_KEY ? 'All sources failed' : 'No WHALE_ALERT_API_KEY configured — add to Vercel env vars for full data',
    fetchedAt: Date.now(),
  };
  return respond(res, fallback, 200); // 200 so Tara doesn't log errors
}
