// ponytail: service worker ini cuma untuk syarat installable PWA, bukan offline
// beneran. Tambahkan Workbox/background-sync kalau nanti perlu pakai offline.
//
// JANGAN kembali ke cache-first untuk HTML (ketemu 13 Sep 2026): nama file chunk
// berubah tiap deploy, jadi shell lama yang tersimpan terus meminta chunk yang
// sudah tidak ada dan halaman mati dengan ChunkLoadError plus 404 beruntun di
// /_next/static/. Versi lama menyimpan "/" selamanya di cache bernama tetap,
// jadi landing page terkunci ke build pertama sampai cache-nya dibuang manual.
const CACHE = "guyub-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Navigasi selalu diambil dari jaringan; cache hanya cadangan waktu offline.
// Halaman selain "/" tidak pernah disimpan karena isinya data tenant yang privat.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (new URL(event.request.url).pathname === "/") {
          const salinan = res.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put("/", salinan)));
        }
        return res;
      })
      .catch(() => caches.match("/").then((cached) => cached ?? Response.error())),
  );
});
