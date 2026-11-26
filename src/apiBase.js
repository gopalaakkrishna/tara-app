// apiBase.js — send the app's relative /api/* calls to an external API host.
//
// Tara's code fetches paths like /api/kalshi/..., /api/okx/..., /api/news and
// /api/whale. On Vercel those were served by rewrites and serverless functions
// in this repo. That routing burned one Vercel edge request per poll, which is
// what pushed the team past the Hobby plan's 1M/month budget and got every
// deployment paused.
//
// The same routes now live on a small Node service (the tara-kalshi-proxy
// repo) that serves /kalshi, /kalshi-public, /okx, /bybit, /coinglass,
// /deribit, /liq, /news and /whale. This module rewrites "/api/<x>" to
// "<API_BASE>/<x>" so the frontend can be plain static files on GitHub Pages
// and all polling goes straight to that service.
//
// Configuration, first match wins:
//   1. localStorage 'taraApiBase'   runtime override, handy for testing a host
//   2. nothing                      shim stays off; relative paths are untouched
//
// The build-time VITE_API_BASE is no longer read here. Tara is served from
// Cloudflare Pages, whose own Functions answer /api/kalshi, /api/kalshi-public,
// /api/okx, /api/bybit, /api/news, /api/liq and /api/deribit. The Cloudflare
// build still had VITE_API_BASE set to the Render proxy from the GitHub Pages
// days, so every /api call went to Render. When that service was suspended
// (seen 2026-11-26), every Kalshi read failed and the site lost its strike
// from at least 2026-11-17. Signed Kalshi calls are routed separately
// (kalshiAuthedFetch: Railway first).
//
// Only same-origin URLs whose path starts with /api/ are rewritten. Absolute
// URLs, WebSockets and everything else pass through unchanged.

const readStorage = () => {
  try {
    return (localStorage.getItem('taraApiBase') || '').trim();
  } catch (_) {
    return '';
  }
};

export const API_BASE = readStorage().replace(/\/+$/, '');

const shouldRewrite = (url) =>
  url.origin === window.location.origin && url.pathname.startsWith('/api/') &&
  !['/api/economic-calendar','/api/learning'].includes(url.pathname); // hosted Pages functions, not legacy proxy routes

// "/api/okx/market/ticker?x=1" -> "<API_BASE>/okx/market/ticker?x=1"
const rewritten = (url) => API_BASE + url.pathname.slice('/api'.length) + url.search;

if (API_BASE && typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string' || input instanceof URL) {
        const url = new URL(String(input), window.location.href);
        if (shouldRewrite(url)) return originalFetch(rewritten(url), init);
      } else if (typeof Request !== 'undefined' && input instanceof Request) {
        const url = new URL(input.url);
        if (shouldRewrite(url)) return originalFetch(new Request(rewritten(url), input), init);
      }
    } catch (_) {
      // Fall through and let the original fetch report whatever is wrong.
    }
    return originalFetch(input, init);
  };

  window.__TARA_API_BASE = API_BASE;
  console.info('[tara] /api/* calls routed to', API_BASE);
}
