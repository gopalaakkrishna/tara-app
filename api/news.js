// api/news.js — Vercel serverless function (V9.8.2)
//
// Server-side news proxy. Browser fetches /api/news with no CORS issues.
// Tries multiple sources in fallback order, returns first that succeeds.
// In-memory cache for 2 minutes to avoid hammering source APIs.
//
// V9.8.2 sources (in order — most-reliable-from-Vercel first):
//   1. CoinDesk RSS    (direct XML fetch + parse)
//   2. Decrypt RSS     (direct XML fetch + parse)
//   3. CoinTelegraph RSS (direct XML fetch + parse)
//   4. rss2json (fallback if direct RSS feeds rate-limit Vercel)
//   5. CryptoPanic     (last resort)
//
// Why these and not Reddit/CryptoCompare:
//   - Reddit aggressively blocks AWS/Vercel datacenter IP ranges (429/403)
//   - CryptoCompare moved to API-key model — free public tier rejected
//   - Direct RSS feeds usually accept any User-Agent and have no per-IP limits

const CACHE_TTL_MS = 120000; // 2 minutes
let _cache = null;

const tryFetch = async (url, timeoutMs = 6000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
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

// Minimal RSS 2.0 parser — handles standard <item> structure for all feeds
// we care about. No external deps. Returns array of {title, url, time, description}.
const parseRss = (xml) => {
  const items = [];
  if (typeof xml !== 'string' || !xml.includes('<item')) return items;
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  const tagRegex = (tag) =>
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const stripCdata = (s) => s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
  const stripTags = (s) => s.replace(/<\/?[^>]+>/g, '').trim();
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = stripTags(stripCdata((block.match(tagRegex('title')) || [])[1] || ''));
    const link = stripTags(stripCdata((block.match(tagRegex('link')) || [])[1] || ''));
    const pubDate = stripTags(stripCdata((block.match(tagRegex('pubDate')) || [])[1] || ''));
    const description = stripTags(stripCdata((block.match(tagRegex('description')) || [])[1] || ''));
    if (!title || !link) continue;
    items.push({
      title,
      url: link,
      time: pubDate ? new Date(pubDate).getTime() : Date.now(),
      description: description.slice(0, 200),
    });
  }
  return items;
};

const respond = (res, payload, status = 200) => {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(payload);
};

const tryRssFeed = async (url, sourceName) => {
  try {
    const r = await tryFetch(url, 6000);
    const xml = await r.text();
    const parsed = parseRss(xml);
    return parsed.slice(0, 15).map((it) => ({
      title: it.title,
      source: sourceName,
      url: it.url,
      time: Number.isFinite(it.time) ? it.time : Date.now(),
      categories: [],
    }));
  } catch (e) {
    console.warn(`[news] ${sourceName} RSS failed:`, e.message);
    return [];
  }
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

  // ── Source 1-3: Direct RSS feeds (parallel) ─────────────────────────
  const rssAttempts = [
    tryRssFeed('https://www.coindesk.com/arc/outboundfeeds/rss/', 'CoinDesk'),
    tryRssFeed('https://decrypt.co/feed', 'Decrypt'),
    tryRssFeed('https://cointelegraph.com/rss', 'CoinTelegraph'),
  ];
  try {
    const results = await Promise.allSettled(rssAttempts);
    let best = null;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        if (!best || r.value.length > best.length) best = r.value;
      }
    }
    if (best && best.length > 0) {
      const sourceName = best[0]?.source || 'rss';
      _cache = { at: Date.now(), items: best, source: sourceName };
      return respond(res, { items: best, source: sourceName });
    }
  } catch (e) {
    console.warn('[news] all RSS feeds failed:', e.message);
  }

  // ── Source 4: rss2json (fallback) ──────────────────────────────────
  try {
    const feeds = [
      { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
      { url: 'https://decrypt.co/feed', name: 'Decrypt' },
      { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph' },
    ];
    for (const f of feeds) {
      try {
        const r = await tryFetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.url)}`,
          6000
        );
        const data = await r.json();
        if (data?.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
          const items = data.items.slice(0, 15).map((it) => ({
            title: it.title,
            source: f.name,
            url: it.link,
            time: it.pubDate ? new Date(it.pubDate).getTime() : Date.now(),
            categories: Array.isArray(it.categories) ? it.categories.slice(0, 3) : [],
          }));
          _cache = { at: Date.now(), items, source: `rss2json-${f.name}` };
          return respond(res, { items, source: `rss2json-${f.name}` });
        }
      } catch (_) { /* try next feed */ }
    }
  } catch (e) {
    console.warn('[news] rss2json failed:', e.message);
  }

  // ── Source 5: CryptoPanic (last resort) ─────────────────────────────
  try {
    const r = await tryFetch(
      'https://cryptopanic.com/api/free/v1/posts/?public=true&currencies=BTC',
      6000
    );
    const data = await r.json();
    const results = data?.results || [];
    const items = results.slice(0, 15).map((p) => ({
      title: p.title,
      source: p.source?.title || 'CryptoPanic',
      url: p.url || p.original_url || '#',
      time: p.published_at ? new Date(p.published_at).getTime() : Date.now(),
      categories: (p.currencies || []).map((c) => c.code).slice(0, 3),
    }));
    if (items.length > 0) {
      _cache = { at: Date.now(), items, source: 'cryptopanic' };
      return respond(res, { items, source: 'cryptopanic' });
    }
  } catch (e) {
    console.warn('[news] CryptoPanic failed:', e.message);
  }

  // ── All failed — serve stale cache if we have one ──────────────────
  if (_cache) {
    return respond(res, {
      items: _cache.items,
      source: _cache.source,
      stale: true,
      ageSec: Math.round((Date.now() - _cache.at) / 1000),
    });
  }

  return respond(
    res,
    { error: 'All sources unavailable', items: [] },
    503
  );
}
