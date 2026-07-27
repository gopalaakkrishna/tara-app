// functions/api/[[path]].js
// Cloudflare Pages Function -- catch-all for /api/* on this Pages project.
// Replaces the plain proxy rewrites from vercel.json:
//   /api/kalshi/*        -> Kalshi authenticated API
//   /api/kalshi-public/*  -> Kalshi public market data (no auth)
//   /api/openmeteo/*      -> Open-Meteo weather
//   /api/nws/*            -> National Weather Service
//   /api/okx/*            -> OKX market data
//   /api/bybit/*          -> Bybit market data
//
// This file does NOT cover /api/news, /api/coinglass, /api/deribit, /api/liq,
// /api/whale -- those were real Vercel serverless functions with source-fallback
// logic (news.js tries CryptoCompare -> Reddit -> CryptoPanic; similar chains
// likely exist in the others). Porting those needs their actual source, which
// isn't in this container. Send me those five files from your repo's /api
// folder and I'll port each one to the Pages Functions Request/Response API
// (Vercel's (req,res) Node-style handlers don't run as-is on Cloudflare).
//
// DEPLOY:
//   1. This file goes at functions/api/[[path]].js in your repo root
//      (sibling to package.json, NOT inside src/).
//   2. Cloudflare Pages dashboard -> Create project -> Connect to GitHub ->
//      pick the tara repo. Build command: npm run build (or vite build).
//      Output directory: dist. Framework preset: Vite.
//   3. No environment variables needed for the public-data proxies below.
//      If /api/kalshi (the authenticated one) needs your API key server-side,
//      set it as a Pages secret and read it via `context.env` -- do NOT
//      hardcode it here.

const TARGETS = {
  'kalshi-public': 'https://api.elections.kalshi.com/trade-api/v2',
  'kalshi': 'https://api.elections.kalshi.com/trade-api/v2',
  'openmeteo': 'https://api.open-meteo.com/v1',
  'nws': 'https://api.weather.gov',
  'okx': 'https://www.okx.com/api',
  'bybit': 'https://api.bybit.com/v5',
};

export async function onRequest(context) {
  const { request, params } = context;
  const segments = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const prefix = segments[0];
  const rest = segments.slice(1).join('/');

  const base = TARGETS[prefix];
  if (!base) {
    return new Response(JSON.stringify({ error: `no proxy target for /api/${prefix}` }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = base + (rest ? '/' + rest : '') + incomingUrl.search;

  // Forward the request as-is (method, body, most headers) to the real API.
  const fwdHeaders = new Headers(request.headers);
  fwdHeaders.delete('host');
  fwdHeaders.delete('cf-connecting-ip');
  fwdHeaders.delete('cf-ray');
  fwdHeaders.delete('cf-visitor');

  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers: fwdHeaders,
      body,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream fetch failed', detail: String(e && e.message || e) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Pass the upstream response through, adding permissive CORS since this is
  // called from the browser and Cloudflare Pages Functions don't add it by default.
  const respHeaders = new Headers(upstream.headers);
  respHeaders.set('access-control-allow-origin', '*');
  respHeaders.delete('content-security-policy'); // avoid double-CSP conflicts with the Pages site itself

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}
