// /functions/api/news.js — Cloudflare Pages Function port of the dead
// Vercel serverless function at api/news.js (V10.7.65, fixed V13.4.121).
// Same logic, ported from Node's (req,res) handler shape to Cloudflare's
// onRequest(context) shape returning a Fetch API Response. See api/news.js
// for the original history/comments -- kept in sync, not duplicated here.
//
// Returns items in the format Tara's useNewsSentiment hook expects:
//   { items: [{title, time, source, sentiment, isImportant}], sources: [] }

const CACHE_TTL_MS = 45000; // 45s — matches client polling interval
let _cache = null;

const tryFetch = async (url, timeoutMs = 6000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/json, */*',
      },
    });
    clearTimeout(timer);
    if (!r.ok) {
      const err = new Error(`HTTP ${r.status}`);
      err.httpStatus = r.status;
      throw err;
    }
    return r;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

const parseRss = (xml) => {
  const items = [];
  if (typeof xml !== 'string' || !xml.includes('<item')) return items;
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  const tagRegex = (tag) => new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const stripCdata = (s) => s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
  const stripTags = (s) => s.replace(/<\/?[^>]+>/g, '').trim();
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = stripTags(stripCdata((block.match(tagRegex('title')) || [])[1] || ''));
    const link = stripTags(stripCdata((block.match(tagRegex('link')) || [])[1] || ''));
    const pubDate = stripTags(stripCdata((block.match(tagRegex('pubDate')) || [])[1] || ''));
    if (!title || !link) continue;
    items.push({ title, url: link, time: pubDate ? new Date(pubDate).getTime() : Date.now() });
  }
  return items;
};

const tryRssFeed = async (url, sourceName, diag) => {
  try {
    const r = await tryFetch(url, 6000);
    const xml = await r.text();
    const items = parseRss(xml).slice(0, 15).map(it => ({
      title: it.title,
      url: it.url || null,
      time: it.time,
      source: sourceName.toLowerCase().replace(/\s/g, ''),
      sentiment: 'neutral',
      isImportant: false,
    }));
    diag[sourceName] = { ok: items.length > 0, count: items.length, error: items.length ? null : 'parsed 0 items — feed format may have changed' };
    return items;
  } catch (e) {
    diag[sourceName] = { ok: false, count: 0, error: e.message || String(e), httpStatus: e.httpStatus || null };
    return [];
  }
};

const tryRss2Json = async (feedUrl, sourceName, diag) => {
  try {
    const r = await tryFetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
      6000
    );
    const d = await r.json();
    if (d?.status !== 'ok' || !Array.isArray(d.items)) {
      diag[`rss2json-${sourceName}`] = { ok: false, count: 0, error: `unexpected response status: ${d?.status || 'unknown'}` };
      return [];
    }
    const items = d.items.slice(0, 15).map(it => ({
      title: it.title,
      url: it.link || null,
      time: it.pubDate ? new Date(it.pubDate).getTime() : Date.now(),
      source: sourceName.toLowerCase(),
      sentiment: 'neutral',
      isImportant: false,
    }));
    diag[`rss2json-${sourceName}`] = { ok: true, count: items.length, error: null };
    return items;
  } catch (e) {
    diag[`rss2json-${sourceName}`] = { ok: false, count: 0, error: e.message || String(e), httpStatus: e.httpStatus || null };
    return [];
  }
};

const respond = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Cache-Control': 's-maxage=45, stale-while-revalidate=120',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
});

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Cache hit
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond({ items: _cache.items, sources: _cache.sources, diagnostics: _cache.diagnostics, cached: true });
  }

  const allItems = [];
  const activeSources = [];
  const diag = {};

  // ── TIER 1: RSS feeds (parallel) ──────────────────────────────────────────
  const rssFeeds = [
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
    { url: 'https://decrypt.co/feed', name: 'Decrypt' },
    { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph' },
  ];
  const rssResults = await Promise.allSettled(rssFeeds.map(f => tryRssFeed(f.url, f.name, diag)));
  for (let i = 0; i < rssResults.length; i++) {
    if (rssResults[i].status === 'fulfilled' && rssResults[i].value.length > 0) {
      allItems.push(...rssResults[i].value);
      activeSources.push(rssFeeds[i].name);
    }
  }

  // ── TIER 2: rss2json fallback for any RSS feeds that failed ───────────────
  if (activeSources.length === 0) {
    for (const f of rssFeeds) {
      const items = await tryRss2Json(f.url, f.name, diag);
      if (items.length > 0) {
        allItems.push(...items);
        activeSources.push(`rss2json-${f.name}`);
        break; // one success is enough
      }
    }
  }

  // ── TIER 3: CryptoPanic (pre-computed sentiment, always run) ──────────────
  try {
    const _cpKey = (env && env.CRYPTOPANIC_API_KEY) || '';
    const _cpUrl = _cpKey
      ? `https://cryptopanic.com/api/free/v1/posts/?auth_token=${encodeURIComponent(_cpKey)}&public=true&currencies=BTC&filter=hot`
      : 'https://cryptopanic.com/api/free/v1/posts/?public=true&currencies=BTC&filter=hot';
    const r = await tryFetch(_cpUrl, 5000);
    const d = await r.json();
    const cpItems = (d?.results || []).slice(0, 15).map(p => ({
      title: p.title || '',
      url: p.url || null,
      time: p.published_at ? new Date(p.published_at).getTime() : Date.now(),
      source: 'cryptopanic',
      sentiment: p.votes
        ? (p.votes.positive > p.votes.negative ? 'bullish'
          : p.votes.negative > p.votes.positive ? 'bearish' : 'neutral')
        : 'neutral',
      isImportant: (p.kind === 'news' && (p.votes?.important || 0) > 2),
    }));
    diag.cryptopanic = { ok: cpItems.length > 0, count: cpItems.length, error: cpItems.length ? null : 'parsed 0 items — check response shape', usedAuthToken: !!_cpKey };
    if (cpItems.length > 0) {
      allItems.push(...cpItems);
      activeSources.push('cryptopanic');
    }
  } catch (e) {
    diag.cryptopanic = {
      ok: false, count: 0,
      error: e.httpStatus === 401 || e.httpStatus === 403
        ? `${e.message} — CryptoPanic now requires auth_token; set CRYPTOPANIC_API_KEY in Cloudflare Pages env vars (free key at cryptopanic.com/developers/api/)`
        : (e.message || String(e)),
      httpStatus: e.httpStatus || null,
      usedAuthToken: !!(env && env.CRYPTOPANIC_API_KEY),
    };
  }

  // ── TIER 4: GDELT macro/geopolitical ──────────────────────────────────────
  try {
    const q = encodeURIComponent(
      '(bitcoin OR btc OR crypto OR "federal reserve" OR "rate cut" OR cpi OR fomc OR sanctions OR war OR iran OR israel OR taiwan OR "banking crisis" OR tariff) sourcelang:eng'
    );
    const r = await tryFetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=15&format=json&timespan=60min&sort=datedesc`,
      5000
    );
    const d = await r.json();
    const gdItems = (d?.articles || []).map(a => {
      const sd = a.seendate || '';
      let time = Date.now() - 3600000;
      if (sd.length >= 14) {
        time = Date.UTC(
          +sd.slice(0,4), +sd.slice(4,6)-1, +sd.slice(6,8),
          +sd.slice(8,10), +sd.slice(10,12), +sd.slice(12,14)
        );
      }
      return { title: a.title || '', url: a.url || null, time, source: 'gdelt', sentiment: 'neutral', isImportant: false };
    });
    diag.gdelt = { ok: gdItems.length > 0, count: gdItems.length, error: gdItems.length ? null : 'parsed 0 articles' };
    if (gdItems.length > 0) {
      allItems.push(...gdItems);
      activeSources.push('gdelt');
    }
  } catch (e) {
    diag.gdelt = { ok: false, count: 0, error: e.message || String(e), httpStatus: e.httpStatus || null };
  }

  // Sort by recency, dedupe by title
  const seen = new Set();
  const deduped = allItems
    .filter(it => { if (!it.title || seen.has(it.title)) return false; seen.add(it.title); return true; })
    .sort((a, b) => b.time - a.time)
    .slice(0, 50);

  if (deduped.length > 0) {
    _cache = { at: Date.now(), items: deduped, sources: activeSources, diagnostics: diag };
    return respond({ items: deduped, sources: activeSources, diagnostics: diag });
  }

  // Stale cache fallback
  if (_cache) {
    return respond({ items: _cache.items, sources: _cache.sources, diagnostics: diag, stale: true });
  }

  return respond({ error: 'All news sources unavailable', items: [], sources: [], diagnostics: diag }, 503);
}
