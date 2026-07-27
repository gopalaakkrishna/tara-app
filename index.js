// worker/index.js
// The single entry point for a "Workers with static assets" deployment.
// Replaces functions/api/[[path]].js, which used Pages Functions file-based
// routing -- that convention isn't read by this project type, so its logic
// is folded in here as an explicit fetch handler instead.
//
// For every request:
//   - path starts with /api/<target>/...  -> proxy to the real upstream API
//   - anything else                        -> serve from the built dist/
//     assets (env.ASSETS), which is how a static SPA is served in this model

const TARGETS = {
  'kalshi-public': 'https://api.elections.kalshi.com/trade-api/v2',
  'kalshi': 'https://api.elections.kalshi.com/trade-api/v2',
  'openmeteo': 'https://api.open-meteo.com/v1',
  'nws': 'https://api.weather.gov',
  'okx': 'https://www.okx.com/api',
  'bybit': 'https://api.bybit.com/v5',
};

async function handleApiProxy(request, url) {
  const segments = url.pathname.replace(/^\/api\//, '').split('/');
  const prefix = segments[0];
  const rest = segments.slice(1).join('/');

  const base = TARGETS[prefix];
  if (!base) {
    return new Response(JSON.stringify({ error: `no proxy target for /api/${prefix}` }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const targetUrl = base + (rest ? '/' + rest : '') + url.search;

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
    upstream = await fetch(targetUrl, { method: request.method, headers: fwdHeaders, body });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream fetch failed', detail: String((e && e.message) || e) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const respHeaders = new Headers(upstream.headers);
  respHeaders.set('access-control-allow-origin', '*');
  respHeaders.delete('content-security-policy');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApiProxy(request, url);
    }

    // Not an API call -- serve the built SPA. env.ASSETS is the binding
    // configured in wrangler.toml ([assets] directory = "./dist").
    return env.ASSETS.fetch(request);
  },
};
