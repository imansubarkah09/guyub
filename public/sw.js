// ponytail: cache-the-shell-only service worker, no offline data sync. Add
// Workbox/background-sync when the app needs real offline usage, not just installability.
const CACHE = "guyub-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
