// Deprecated: This SW is intentionally disabled to avoid duplicate notifications.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { await self.registration.unregister(); } catch {}
    try { await clients.claim(); } catch {}
  })());
});