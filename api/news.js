// api/news.js — Vercel serverless function
//
// Server-side news proxy. Browser fetches /api/news with no CORS issues.
// Tries multiple sources in fallback order, returns first that succeeds.
// In-memory cache for 2 minutes to avoid hammering source APIs.
//
// Sources (in order):
//   1. CryptoCompare — free public BTC news feed
//   2. Reddit r/CryptoCurrency — community discussion + breaking news
//   3. CryptoPanic — aggregator with sentiment tagging
//
// Same fallback approach as the old client-side code, but server-side, so
// no CORS proxies needed. corsproxy.io / codetabs / allorigins / rss2json
// were all eventually getting blocked or rate-limited per-IP. Server-to-
// server fetches bypass all of that.

const CACHE_TTL_MS = 120000; // 2 minutes — keeps source APIs happy

// Module-level cache. Vercel functions can be cold-started, but warm instances
// share this. Worst case: cache miss = source fetch.
let _cache = null;

const tryFetch = async (url, timeoutMs = 6000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Some APIs (Reddit especially) reject fetch with default Node user-agent.
        // Real-looking UA gets through.
        'User-Agent': 'Mozilla/5.0 (compatible; TaraNewsBot/1.0; +https://tara11.vercel.app)',
        'Accept': 'application/json, text/plain, */*',
      },
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

const respond = (res, payload, status = 200) => {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(payload);
};

export default async function handler(req, res) {
  // Cache hit — fast path
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond(res, {
      items: _cache.items,
      source: _cache.source,
      cached: true,
      ageSec: Math.round((Date.now() - _cache.at) / 1000),
    });
  }

  // ── Source 1: CryptoCompare ─────────────────────────────────────────
  try {
    const r = await tryFetch(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC',
      5000
    );
    const data = await r.json();
    const items = (data?.Data || []).slice(0, 15).map(n => ({
      title: n.title,
      source: n.source_info?.name || n.source || 'News',
      url: n.url,
      time: n.published_on * 1000,
      categories: (n.categories || '').split('|').filter(Boolean),
    }));
    if (items.length > 0) {
      _cache = { at: Date.now(), items, source: 'cryptocompare' };
      return respond(res, { items, source: 'cryptocompare' });
    }
  } catch (e) {
    console.warn('[news] CryptoCompare failed:', e.message);
  }

  // ── Source 2: Reddit r/CryptoCurrency ───────────────────────────────
  try {
    const r = await tryFetch(
      'https://www.reddit.com/r/CryptoCurrency/hot.json?limit=20',
      6000
    );
    const data = await r.json();
    const children = data?.data?.children || [];
    const items = children
      .filter(c => c?.data && !c.data.stickied)
      .slice(0, 15)
      .map(c => ({
        title: c.data.title,
        source: 'r/CryptoCurrency',
        url: 'https://reddit.com' + c.data.permalink,
        time: c.data.created_utc * 1000,
        categories: [c.data.link_flair_text || 'Discussion'].filter(Boolean),
      }));
    if (items.length > 0) {
      _cache = { at: Date.now(), items, source: 'reddit' };
      return respond(res, { items, source: 'reddit' });
    }
  } catch (e) {
    console.warn('[news] Reddit failed:', e.message);
  }

  // ── Source 3: CryptoPanic free public posts ─────────────────────────
  try {
    const r = await tryFetch(
      'https://cryptopanic.com/api/free/v1/posts/?public=true&currencies=BTC',
      6000
    );
    const data = await r.json();
    const results = data?.results || [];
    const items = results.slice(0, 15).map(p => ({
      title: p.title,
      source: p.source?.title || 'CryptoPanic',
      url: p.url || p.original_url || '#',
      time: p.published_at ? new Date(p.published_at).getTime() : Date.now(),
      categories: (p.currencies || []).map(c => c.code).slice(0, 3),
    }));
    if (items.length > 0) {
      _cache = { at: Date.now(), items, source: 'cryptopanic' };
      return respond(res, { items, source: 'cryptopanic' });
    }
  } catch (e) {
    console.warn('[news] CryptoPanic failed:', e.message);
  }

  // ── All sources failed — serve stale cache if we have one ──────────
  if (_cache) {
    return respond(res, {
      items: _cache.items,
      source: _cache.source,
      stale: true,
      ageSec: Math.round((Date.now() - _cache.at) / 1000),
    });
  }

  // Nothing — actual failure
  return respond(
    res,
    { error: 'All sources unavailable', items: [] },
    503
  );
}
