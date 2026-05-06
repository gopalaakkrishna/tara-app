// Tara V8.8 — KILL SWITCH SERVICE WORKER
// This service worker exists ONLY to unregister itself and clear all caches.
// Replaces any prior caching service worker that may be serving stale code.
// After this runs once, the page reloads and fetches everything fresh from the server.

self.addEventListener('install', (event) => {
  // Skip the "waiting" phase — activate immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Clear all caches
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (e) { /* ignore */ }
    
    // 2. Take control of all open clients (tabs)
    try {
      await self.clients.claim();
    } catch (e) { /* ignore */ }
    
    // 3. Unregister this service worker
    try {
      await self.registration.unregister();
    } catch (e) { /* ignore */ }
    
    // 4. Force-reload all controlled clients with fresh code
    try {
      const allClients = await self.clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        try {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  })());
});

// 5. Pass-through fetch — never serve from cache, always go to network
self.addEventListener('fetch', (event) => {
  // Don't intercept; let the browser handle natively from network
  return;
});
