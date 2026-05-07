// Tara V8.8.5 — TRUE NO-OP SERVICE WORKER (replaces V8.8 kill switch)
//                   (still current as of V9.7.9 — no functional changes needed)
//
// The previous "kill switch" SW called `client.navigate(client.url)` in its
// activate handler to force-reload tabs after unregistering itself. That ONE
// line was the reload-spasm trigger: every time the browser checked for SW
// updates on navigation (which it does automatically on every page load
// within scope), this activate handler could fire and trigger another reload,
// which triggered another update check, which fired another activate, etc.
//
// V8.8.5 strips the SW down to: install → skipWaiting → activate → clear
// caches → unregister self → done. No claim, no navigate, no fetch handler.
// Browser handles all requests natively. Future page loads see no SW
// controlling them. No reloads. No spasms.
//
// Once this version of sw.js is fetched once, the user's browser will install
// it, run activate, unregister it, and that's the last sw.js the user ever
// has. Subsequent deploys keep this no-op file in place so any user who
// returns with a stale registered SW gets the same auto-unregister behavior.

self.addEventListener('install', (event) => {
  // Activate immediately; we have nothing to install.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clear any caches left behind by older Tara service workers.
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    } catch (_) { /* ignore */ }
    // Unregister ourselves silently. No claim(), no navigate(). The current
    // page keeps running with whatever it has; the next navigation goes
    // straight to the network with no SW in the picture.
    try {
      await self.registration.unregister();
    } catch (_) { /* ignore */ }
  })());
});

// Intentionally NO fetch handler. The browser handles all requests natively.
