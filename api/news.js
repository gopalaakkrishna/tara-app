// /api/news.js — Vercel serverless function (V10.7.65)
// Merged: original RSS reliability (CoinDesk/Decrypt/CT) + new CryptoPanic sentiment + GDELT macro
// Returns items in format Tara's useNewsSentiment hook expects:
//   { items: [{title, time, source, sentiment, isImportant}], sources: [] }
//
// CryptoPanic items: sentiment pre-computed from votes (bullish/bearish/neutral)
// RSS items: keyword scoring done client-side in useNewsSentiment
// GDELT items: macro/geo stories, keyword scored client-side

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
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
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

const tryRssFeed = async (url, sourceName) => {
  try {
    const r = await tryFetch(url, 6000);
    const xml = await r.text();
    return parseRss(xml).slice(0, 15).map(it => ({
      title: it.title,
      time: it.time,
      source: sourceName.toLowerCase().replace(/\s/g, ''),
      sentiment: 'neutral',
      isImportant: false,
    }));
  } catch (e) {
    return [];
  }
};

const tryRss2Json = async (feedUrl, sourceName) => {
  try {
    const r = await tryFetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
      6000
    );
    const d = await r.json();
    if (d?.status !== 'ok' || !Array.isArray(d.items)) return [];
    return d.items.slice(0, 15).map(it => ({
      title: it.title,
      time: it.pubDate ? new Date(it.pubDate).getTime() : Date.now(),
      source: sourceName.toLowerCase(),
      sentiment: 'neutral',
      isImportant: false,
    }));
  } catch (e) {
    return [];
  }
};

const respond = (res, payload, status = 200) => {
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=120');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(status).json(payload);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(204).end();
  }

  // Cache hit
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond(res, { items: _cache.items, sources: _cache.sources, cached: true });
  }

  const allItems = [];
  const activeSources = [];

  // ── TIER 1: RSS feeds (parallel) ──────────────────────────────────────────
  const rssFeeds = [
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
    { url: 'https://decrypt.co/feed', name: 'Decrypt' },
    { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph' },
  ];
  const rssResults = await Promise.allSettled(rssFeeds.map(f => tryRssFeed(f.url, f.name)));
  for (let i = 0; i < rssResults.length; i++) {
    if (rssResults[i].status === 'fulfilled' && rssResults[i].value.length > 0) {
      allItems.push(...rssResults[i].value);
      activeSources.push(rssFeeds[i].name);
    }
  }

  // ── TIER 2: rss2json fallback for any RSS feeds that failed ───────────────
  if (activeSources.length === 0) {
    for (const f of rssFeeds) {
      const items = await tryRss2Json(f.url, f.name);
      if (items.length > 0) {
        allItems.push(...items);
        activeSources.push(`rss2json-${f.name}`);
        break; // one success is enough
      }
    }
  }

  // ── TIER 3: CryptoPanic (pre-computed sentiment, always run) ──────────────
  try {
    const r = await tryFetch(
      'https://cryptopanic.com/api/free/v1/posts/?public=true&currencies=BTC&filter=hot',
      5000
    );
    const d = await r.json();
    const cpItems = (d?.results || []).slice(0, 15).map(p => ({
      title: p.title || '',
      time: p.published_at ? new Date(p.published_at).getTime() : Date.now(),
      source: 'cryptopanic',
      // Pre-computed from community votes — Tara uses these directly
      sentiment: p.votes
        ? (p.votes.positive > p.votes.negative ? 'bullish'
          : p.votes.negative > p.votes.positive ? 'bearish' : 'neutral')
        : 'neutral',
      isImportant: (p.kind === 'news' && (p.votes?.important || 0) > 2),
    }));
    if (cpItems.length > 0) {
      allItems.push(...cpItems);
      activeSources.push('cryptopanic');
    }
  } catch (e) { /* silent */ }

  // ── TIER 4: GDELT macro/geopolitical (server-side — no 429 from Vercel) ──
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
      return { title: a.title || '', time, source: 'gdelt', sentiment: 'neutral', isImportant: false };
    });
    if (gdItems.length > 0) {
      allItems.push(...gdItems);
      activeSources.push('gdelt');
    }
  } catch (e) { /* silent */ }

  // Sort by recency, dedupe by title
  const seen = new Set();
  const deduped = allItems
    .filter(it => { if (!it.title || seen.has(it.title)) return false; seen.add(it.title); return true; })
    .sort((a, b) => b.time - a.time)
    .slice(0, 50);

  if (deduped.length > 0) {
    _cache = { at: Date.now(), items: deduped, sources: activeSources };
    return respond(res, { items: deduped, sources: activeSources });
  }

  // Stale cache fallback
  if (_cache) {
    return respond(res, { items: _cache.items, sources: _cache.sources, stale: true });
  }

  return respond(res, { error: 'All news sources unavailable', items: [], sources: [] }, 503);
}
