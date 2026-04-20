// Tara V106 Service Worker — safe version, never caches HTML
const CACHE_NAME = 'tara-v106-assets';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  // Clear ALL old caches on activation
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // NEVER cache HTML — always fetch fresh so layout changes propagate immediately
  if (e.request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // NEVER cache external API calls
  const isExternal = !url.hostname.includes(self.location.hostname);
  if (isExternal) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache JS/CSS assets (not HTML) with network-first
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

