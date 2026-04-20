// Tara V106 Service Worker
// Caches the app shell so it loads instantly and keeps the tab alive in background
const CACHE_NAME = 'tara-v106';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/src/App.jsx',
];

// Install: cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for app shell
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always go network-first for external APIs (Coinbase, Binance, Kalshi, Discord)
  const isAPI =
    url.hostname.includes('coinbase') ||
    url.hostname.includes('binance') ||
    url.hostname.includes('bybit') ||
    url.hostname.includes('kalshi') ||
    url.hostname.includes('discord') ||
    url.hostname.includes('polymarket');

  if (isAPI) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first for app shell assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// Keep-alive: respond to periodic background sync to prevent tab suspension
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'tara-keepalive') {
    e.waitUntil(Promise.resolve());
  }
});
