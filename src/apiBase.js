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
//   2. VITE_API_BASE at build time  set as a GitHub Actions repository variable
//   3. nothing                      shim stays off; relative paths are untouched
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

const fromBuild = (import.meta.env.VITE_API_BASE || '').trim();

export const API_BASE = (readStorage() || fromBuild).replace(/\/+$/, '');

const shouldRewrite = (url) =>
  url.origin === window.location.origin && url.pathname.startsWith('/api/');

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
