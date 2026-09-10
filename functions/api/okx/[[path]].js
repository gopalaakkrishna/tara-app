// Cloudflare Pages Function replacing the dead Vercel rewrite:
//   vercel.json: /api/okx/:path* -> https://www.okx.com/api/v5/:path*
// Feeds core price/funding/OI signals (candles, order book, mark price,
// funding rate, long/short ratio) used throughout the scoring engine.

const UPSTREAM = 'https://www.okx.com/api/v5/';

export async function onRequest(context) {
  const { request, params } = context;
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const search = new URL(request.url).search;
  const upstreamUrl = UPSTREAM + path + search;

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method: request.method,
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 TaraApp' },
      body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : await request.text(),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream fetch failed', detail: String(e && e.message || e) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const body = await upstreamRes.text();
  return new Response(body, {
    status: upstreamRes.status,
    headers: {
      'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
