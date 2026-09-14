# CLAUDE.md: Instruksi Proyek untuk Claude Code

> File ini otomatis dibaca Claude Code sebagai konteks project setiap kali sesi dimulai di root repo ini. Taruh file ini di root repo (sejajar dengan `package.json`), dan taruh `arisan-app-spec.md` di `docs/`.

## Sebelum mulai kerja
1. Baca `docs/arisan-app-spec.md` secara penuh, itu spec fungsional lengkap (entities, fitur, fase, open questions).
2. Baca folder `./references/app/`, source code schoolcommunity.space (aplikasi kas kelas milik Iman). Contek pola UI, struktur folder, dan alur yang relevan, **kecuali** bagian yang eksplisit beda di spec (terutama alur onboarding anggota, lihat §4.1 spec).
3. Kerjakan sesuai urutan Fase di §8 spec. Jangan lompat fase kecuali diminta.
4. Kalau ketemu keputusan yang belum jelas dan masuk daftar §7 spec (open questions), **stop dan tanya Iman**, jangan asumsi sendiri untuk hal-hal yang sudah ditandai open.

## Stack & Infrastruktur (wajib, jangan diganti tanpa konfirmasi)

| Komponen | Pilihan |
|---|---|
| Framework | Next.js |
| Compute/hosting | Cloudflare Workers |
| Database | Neon Postgres |
| Asset storage | Cloudinary (image & dokumen) |
| Repo & CI/CD | GitHub + GitHub Actions |
| Analytics/SEO | Google Search Console, Google Analytics |
| Dev server | `http://127.0.0.1:3000` (wajib port ini, akan di-tunnel manual oleh Iman ke `http://dev.thedreamcompany.space`) |
| Production | `https://guyub.thedreamcompany.space` di Cloudflare |
| PWA | Wajib installable di Android, template mobile-first |

## Tugas prioritas di awal (Fase 0)
- Desain **icon aplikasi & favicon yang iconic**, tema visual "hunian rumah yang indah", icon-icon menenangkan (lihat §4.12 spec)
- Setup PWA dasar (manifest.json, service worker, icon set berbagai ukuran)
- Setup skema database (Neon Postgres) mengikuti model data di §3 spec, perhatikan `User` (global) terpisah dari `Membership` (role per tenant), ini krusial untuk fitur multi-tenant multi-role

## Hal yang HARUS diperhatikan (business rules sensitif)
- **Onboarding anggota tenant BEDA dari school app**, jangan pakai pola self-register bebas via link publik. Ikuti alur di §4.1 spec (invite via WA + konfirmasi pengurus).
- **Copy landing page**: jangan klaim "gratis penuh" atau "tidak ada iklan/tidak dijual" secara mutlak, lihat §4.10 spec untuk alasannya (rencana bisnis jangka panjang Iman).
- **Multi-tenant multi-role**: satu akun (satu email) bisa punya role berbeda di tenant berbeda secara bersamaan, pastikan model data & auth mendukung ini sejak awal (§2 & §3 spec), jangan hardcode 1 user = 1 role.
- Fitur berbayar (upload bukti transfer, payment gateway) baru masuk di Fase 4-5, jangan dikerjakan lebih awal, dan billing mechanism-nya masih open question (§7).

## Struktur folder yang diharapkan
```
docs/arisan-app-spec.md   # spec fungsional lengkap
references/app/           # source code schoolcommunity.space (referensi, read-only)
```

## Login Google: WAJIB lewat tunnel, bukan raw port (ketemu 13 Sep 2026)

`NEXTAUTH_URL`/`BETTER_AUTH_URL` di `.env.development` dipatok ke
`https://dev.thedreamcompany.space`, jadi better-auth menerbitkan cookie
state/session dengan flag `Secure`. Browser diam-diam membuang cookie
`Secure` di koneksi `http://` biasa, jadi login Google asli di
`http://127.0.0.1:3000` langsung akan **loop balik ke /login terus-menerus**
(Google sukses, tapi cookie sesi tidak pernah nempel). Ini bukan bug config
OAuth (redirect URI di Google Console sudah benar untuk kedua origin, sudah
diverifikasi manual).

**Login Google asli WAJIB dites di `https://dev.thedreamcompany.space`**
(tunnel harus aktif). `http://127.0.0.1:3000` tetap dipakai untuk dev
server (sesuai baris di atas) dan cocok untuk cek route/UI yang tidak butuh
sesi asli, tapi bukan untuk uji login Google end-to-end. Pola yang sama
persis ada di `references/app/school-community`, makanya proyek itu punya
skill dev-login terpisah (suntik cookie sesi palsu) khusus untuk tes di raw
port, bukan login Google asli.

## Verifikasi sebelum klaim "sudah bisa dicoba" (instruksi Iman, 13 Sep 2026)

Sebelum bilang suatu fitur "sudah jalan, bisa dicoba", verifikasi dulu
sungguhan, jangan cuma modal build/lint hijau:
- Kalau ada Claude in Chrome tersambung di sesi ini: pakai itu untuk klik
  langsung alurnya di browser sebelum melapor selesai.
- Login Google ASLI tidak bisa diotomasi dari sisi Claude (Google memblokir
  login otomatis/headless, dan Claude tidak pegang password/2FA Iman), batas ini harus disebutkan eksplisit, jangan pura-pura sudah diverifikasi
  penuh kalau sebenarnya cuma dicek sampai halaman consent Google muncul.
- Kalau Claude in Chrome belum tersambung, verifikasi manual pakai
  `curl -i` terhadap endpoint yang relevan (redirect, cookie flags, status
  code) dan sebutkan dengan jelas mana yang sudah diverifikasi otomatis vs
  mana yang masih butuh Iman coba sendiri di browser.
- **Event handler di Server Component lolos tsc + eslint + build, baru meledak saat di-render** (ketemu 13 Sep 2026: `onFocus` inline di `<input>` pada halaman tanpa `"use client"` di `/t/[id]/anggota`), errornya baru muncul di runtime browser ("Event handlers cannot be passed to Client Component props"), bukan di build. Sebelum bilang halaman baru/diedit sudah beres, grep dulu file itu untuk `onClick|onChange|onFocus|onSubmit|onBlur` dkk. dan pastikan file itu punya `"use client"` di baris pertama kalau memang butuh, kalau tidak, pindahkan interaktivitas itu ke komponen client terpisah.

## Dua jebakan Cloudflare Workers yang sudah pernah menjatuhkan produksi (13 Sep 2026)

**Cakupan Prisma client: satu per REQUEST, bukan per proses dan bukan per
pemanggilan.** `cache()` React sempat dipakai untuk ini dan ternyata tidak
mengikat ke request di aplikasi ini: terukur 3 client dibuat untuk satu kali
muat halaman. Efek diamnya jauh lebih berbahaya daripada borosnya koneksi,
`$transaction([...])` yang tersusun dari beberapa client TIDAK atomik, sehingga
penautan pasangan di Silsilah tersimpan setengah jalan lalu menabrak unique
spouseId (500 P2002). `src/lib/prisma.ts` sekarang menitipkan client ke
ExecutionContext request di workerd, dan memakai singleton proses di Node.
Kalau menyentuh file itu, ukur dulu jumlah client per request sebelum percaya.

**1101, Prisma client tidak boleh singleton modul.** Modul hidup lebih lama dari
satu request di sebuah isolate, sedangkan koneksi WebSocket Neon yang dibuka
request sebelumnya haram dipakai request berikutnya. Gejalanya di log Worker:
"Cannot perform I/O on behalf of a different request", "Connection terminated",
lalu "code had hung and would never generate a response". Request pertama di
isolate baru selalu lolos, jadi bugnya terasa acak dan tidak muncul di curl
sekali jalan. `src/lib/prisma.ts` sekarang membuat client per request lewat
`cache()` React. Jangan dikembalikan jadi singleton.

**1102, jangan render gambar saat request.** Ikon PWA dulu dibuat `next/og`
(`/pwa-icon/192`, `/pwa-icon/512`, `apple-icon.tsx`) dan memakan 777 sampai 888
ms CPU per request. Satu kali buka halaman dari HP mengambil beberapa ikon
sekaligus, isolate kena batas CPU, dan invocation lain yang tidak bersalah ikut
mati. Ikon sekarang PNG statis di `/public`. Halaman biasa setelah panas cuma 4
sampai 17 ms CPU, jadi kalau ada angka ratusan ms, curigai rendering runtime.

**ChunkLoadError plus 404 di /_next/static, service worker jangan cache-first.**
`public/sw.js` versi awal menyimpan "/" di cache bernama tetap dan melayani semua
request cache-first. Nama file chunk berubah tiap deploy, jadi shell lama yang
tersimpan terus meminta chunk yang sudah dihapus dan landing page mati permanen,
tidak sembuh dengan reload biasa. Sekarang navigasi selalu network-first, cache
cuma cadangan offline untuk "/", dan cache versi lama dibuang saat activate.
Halaman selain "/" sengaja tidak pernah disimpan karena isinya data tenant privat.

**Navigasi internal WAJIB pakai `next/link`, bukan `<a href>`** (ketemu 13 Sep
2026, ini alasan utama guyub terasa lebih lambat dari school-community). Seluruh
menu guyub dulu memakai `<a>`, jadi setiap ketukan menu adalah muat dokumen
penuh: HTML diambil ulang dari Worker, semua chunk diunduh dan dieksekusi lagi,
React hidrasi ulang dari nol. `references/app/school-community` memakai
`next/link` di 39 file dan nol `<a>` internal, itu sebabnya terasa instan.
Diukur di build produksi lokal (tanpa latensi jaringan): muat dokumen penuh
median 557 ms, transisi client-side median 104 ms.

Dua catatan yang menyertainya:
- Sidebar tenant memakai `prefetch={false}` karena 10+ tautannya terlihat
  sekaligus dan tiap halaman tenant menembak DB; prefetch bawaan berarti belasan
  render SSR cuma karena menu tampak.
- `<a>` tetap benar untuk tautan eksternal (wa.me, Trakteer, bukti Cloudinary)
  dan di `t/[tenantId]/error.tsx`, karena di sana muat ulang penuh justru cara
  pulih dari state client yang rusak.
- Uji client-side transition HARUS di build produksi. Di `next dev`, pindah ke
  route yang belum terkompilasi tetap memicu muat dokumen penuh, jadi tes di dev
  akan bilang perbaikannya gagal padahal tidak.

**Jangan menjumlah uang dengan menarik semua barisnya** (audit 14 Sep 2026, ini
sebab paling besar CPU/memori Worker membengkak). `src/lib/ringkasan.ts` dulu
menarik SELURUH `KasTransaksi`, `InfaqShodaqoh`, donasi kegiatan, dan slot qurban
satu tenant lalu menjumlahkannya dengan `reduce()` di JavaScript, dan fungsi itu
dipanggil enam halaman (Dashboard, Kas, Infaq, Laporan, Dana Kegiatan lewat
`daftarPool`). Terukur pada tenant berisi 5.000 transaksi kas: cara lama menarik
**8.003 baris dalam 347 ms**, agregat SQL (`groupBy`/`aggregate`) menghasilkan
**angka yang sama persis dari 7 baris dalam 24 ms**. Halaman Kas bahkan membayar
dua kali karena ia memuat daftarnya sendiri DAN memanggil ringkasan.

Aturannya sekarang: angka pakai `angkaTenant()` (agregat SQL), baris cuma diambil
kalau memang ditampilkan, dan yang ditampilkan selalu punya `take`. `include`
relasi yang tumbuh tanpa batas (`trakteer: true` di semua tenant, `donasi: true`
di semua kegiatan, `memberships` di semua tenant) diganti `groupBy` + `_count`.

**`cache()` React TERBUKTI bekerja di workerd untuk dedup fungsi.** Ini tidak
bertentangan dengan catatan cakupan Prisma client di atas: yang dulu gagal adalah
memakai `cache()` untuk memegang INSTANS client, sedangkan untuk menyatukan
pembacaan yang sama dalam satu request ia berfungsi. Diukur berpasangan (Node
`next dev` vs `wrangler dev`), jumlah query per halaman identik: tanpa `cache()`
tiap halaman tenant menembakkan 3x SELECT User dan 2-3x SELECT Membership yang
isinya sama. Pemakai: `getSessionUser()` di `src/lib/session.ts`,
`membershipSaya()` di `src/lib/effective-roles.ts`, `tenantDenganProfil()` di
`src/lib/tenant.ts`. Layout tenant dan halamannya WAJIB lewat helper itu, jangan
memanggil `prisma.*` langsung untuk data yang sama.

**Cara mengukur ulang** (jangan menebak, angkanya gampang didapat): jalankan dev
server dengan `PRISMA_LOG=1` lalu hitung baris `prisma:query` di antara dua
request, itu yang dipakai audit ini. Untuk workerd: `pnpm cf:build`, taruh
`PRISMA_LOG=1` di `.dev.vars`, `npx wrangler dev --port 8787`, hitung dari
lognya. Patokan sesudah audit: Dashboard 17 query, Kas 10, Infaq 10, Kegiatan 12,
Laporan 17, Arisan 7, Anggota 8, Tabungan 8, Silsilah 7, Qurban 6. Kalau angka ini
naik banyak, ada `include` baru yang kebablasan.

**`relationJoins` menyala, dan itu fitur PREVIEW Prisma.** Dengan flag ini
Postgres memakai LATERAL JOIN, jadi satu `include` bersarang tidak lagi pecah jadi
satu query per relasi (Dashboard 20 → 17, Silsilah 11 → 7, Qurban 9 → 6). Perlu
diingat dua hal: flag ini ada di KEDUA generator di `prisma/schema.prisma` (yang
Node dan yang workerd), dan karena statusnya preview, `take`/`orderBy` di relasi
bersarang wajib diuji ulang kalau versi Prisma naik. Alat ujinya sudah ada:
`scripts/db-ops-cek-relationjoins.mjs` (gitignored) menjalankan bentuk query yang
dipakai aplikasi dua kali, strategi `join` dan `query`, lalu membandingkan
hasilnya baris demi baris di atas data yang sengaja diisi dulu. Jangan
membandingkan di tabel kosong, itu selalu lulus dan tidak membuktikan apa-apa.

**`pnpm lint` tanpa argumen kehabisan heap sesudah `pnpm cf:build`.** Bundel 41 MB
di `.open-next/` membuat eslint mati dengan exit 134, padahal `globalIgnores`
sudah memuatnya. Karena itu script `lint` di `package.json` menyebut petaknya
secara eksplisit (`src scripts next.config.ts ...`), jangan dikembalikan jadi
`eslint` polos.

Cara membaca lognya: `observability` sudah aktif di `wrangler.jsonc`, dan
`npx wrangler tail --format json` menampilkan `cpuTime`, `outcome`, serta
exception per request.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
