// Sengaja BUKAN offline transaksional (background-sync kas/infaq/dll saat
// offline): data tenant privat, dan menyimpannya di cache PWA di HP yang bisa
// dipakai bergantian melanggar alasan yang sama kenapa halaman selain "/" di
// bawah tidak pernah di-cache. Ini keputusan tetap, bukan yang ditunda — kalau
// nanti benar-benar perlu, itu fitur besar terpisah (idempotensi, resolusi
// konflik saldo), bukan upgrade satu file ini.
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

// Web Push: payload dari src/lib/push.ts ({ judul, isi, url }). tag = url supaya
// beberapa notifikasi ke halaman yang sama menumpuk jadi satu, renotify supaya
// yang menumpuk tetap bunyi/getar lagi.
self.addEventListener("push", (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(d.judul || "Guyub", {
      body: d.isi,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.url,
      renotify: true,
      data: { url: d.url || "/dashboard" },
    }),
  );
});

// Tap notifikasi: pakai jendela Guyub yang sudah terbuka (PWA atau tab) kalau
// ada, baru buka jendela baru kalau tidak ada sama sekali.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const w = wins.find((c) => new URL(c.url).origin === self.location.origin);
      if (!w) return self.clients.openWindow(url);
      // navigate() ditolak untuk jendela yang belum dikendalikan SW ini.
      return w
        .navigate(url)
        .then((c) => (c ?? w).focus())
        .catch(() => self.clients.openWindow(url));
    }),
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
