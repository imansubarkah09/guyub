# REBRANDING-AUDIT: Guyub menjadi KOMUNITA

Fase 1 (audit). Pekerjaan rebranding dilakukan di folder terpisah `~/projects/komunita` (clone repo yang sama, branch `rebrand-komunita` dari `main`), sedangkan `~/projects/guyub` tetap utuh. Semua isi di bawah berasal dari pembacaan kode di branch `dev` (22 Nov 2026), bukan tebakan.

## 1. Arsitektur aplikasi

| Komponen | Fakta di kode |
|---|---|
| Framework | Next.js 16.4.2 (App Router), React 19.2.8, TypeScript, Tailwind 4 |
| Hosting | Cloudflare Workers lewat `@opennextjs/cloudflare` (`wrangler.toml`, `workers_dev = false`) |
| Database / ORM | Neon Postgres, Prisma 6.19 dengan `@prisma/adapter-neon`, dua generator (Node dan workerd) |
| Auth | Better Auth 1.7, hanya Google OAuth, sesi disimpan lewat Prisma, `cookieCache` 60 detik. Tidak ada login email/password |
| Upload | Cloudinary lewat `fetch` REST (bukan SDK) |
| Pembayaran / donasi | Xendit (webhook invoice), Trakteer (webhook) |
| Notifikasi | Web Push (`web-push`), VAPID subject diambil dari `NEXT_PUBLIC_URL` |
| PWA | `manifest.ts`, `public/sw.js` (cache `guyub-shell-v2`), ikon PNG statis |
| CI/CD | `.github/workflows/ci-cd.yml`, deploy hanya dari `main`. `NEXTAUTH_URL` dan `NEXT_PUBLIC_URL` dibaca dari GitHub secrets saat build |
| Tes | Playwright (`e2e/public.spec.ts`), skrip `scripts/db-ops-*.mjs` |

Satu domain untuk semuanya. Tidak ada subdomain API terpisah, jadi tidak ada CORS lintas domain.

## 2. Database (tidak disentuh rebranding)

Multi-tenant: `User` global, `Membership` (role per tenant), semua data kerja menunjuk `tenantId`.
Model: User, Account, Session, Verification, Tenant, TenantProfile, Membership, Invitation, AuditLog, FamilyNode,
KasTransaksi, Pinjaman, PinjamanCicilan, TabunganTipe, TabunganSaldo, TabunganSetoran, QurbanGroup, QurbanSlot,
Arisan, ArisanPeserta, ArisanUndian, ArisanPembayaran, Laporan, InfaqShodaqoh, PlerekPutaran, PlerekBerasKeluar,
PlerekSetoranKas, DanaKegiatan, DanaKegiatanSumber, DanaKegiatanDonasi, TrakteerDonasi, Notifikasi,
PushSubscription, TenantApprovalRequest.

Kata "Guyub" di `prisma/schema.prisma` hanya di komentar baris 1. Tidak ada nama tabel, kolom, atau enum bernama guyub.
**Rebranding tidak membutuhkan migrasi database sama sekali.**

## 3. Halaman (29 rute `page.tsx`) dan route handler (5)

Publik: `/`, `/tentang`, `/login`, `/register`, `/invite/[token]`, `/laporan/[shareLink]`, `/cari`.
Pengguna: `/dashboard`.
Tenant: `/t/[tenantId]` dengan anggota, arisan (+jadwal), infaq, kas, kegiatan, laporan, notifikasi, pinjaman, plerek, profil, qurban, silsilah, tabungan.
Platform owner: `/platform`, `/platform/owners`, `/platform/pengguna`, `/admin`, `/admin/tenant/[tenantId]`, `/admin/trakteer`.
Route: `/api/auth/[...all]`, `/api/version`, `/api/webhooks/xendit`, `/api/webhooks/trakteer`, `/t/[tenantId]/laporan/[laporanId]/pdf`.

## 4. Fitur yang harus tetap jalan

Manajemen anggota dan undangan, kas, pinjaman, tabungan, arisan dan undian, qurban, silsilah, infaq, plerek, dana kegiatan,
laporan keuangan (publik via tautan dan PDF), notifikasi dan push, role per tenant, persetujuan tenant, donasi Trakteer, audit log.

## 5. Komponen branding yang harus diganti

55 berkas memuat kata "guyub" (di luar `node_modules`). Dikelompokkan:

**Tampilan (ganti ke KOMUNITA):** `src/app/layout.tsx` (metadata, OG, title), `src/app/page.tsx` (landing), `src/app/tentang/page.tsx`,
`src/app/manifest.ts`, `src/components/guyub-logo.tsx` (komponen logo), `site-header`, `site-footer`, `platform-shell`,
`tenant-shell`, `install-banner`, `update-banner`, `push-button`, `profile-menu`, `dashboard/page.tsx` dan `loading.tsx`, `cari/page.tsx`,
`laporan/[shareLink]/page.tsx`, `admin/page.tsx`, judul notifikasi push (`lib/notifikasi.ts`, `lib/push.ts`, `public/sw.js`),
PDF laporan (`laporan/[laporanId]/pdf/route.ts`), dan teks di actions kas, tabungan, profil, kegiatan, laporan.

**Aset lama:** `public/favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-icon.png`, `og-image.png`, `public/screenshots/*`.

**Tema warna:** semua lewat CSS variable di `src/app/globals.css` (`--primary: #a45626` terakota, `--background: #fdf8f2`, dst).
Pergantian ke palet hijau KOMUNITA cukup mengganti token itu, tidak perlu menyentuh komponen satu per satu.
`manifest.ts` memakai `theme_color` dan `background_color` sendiri.

**Dokumentasi historis (boleh tetap "Guyub"):** `docs/arisan-app-spec.md`, `docs/tasks/*`, `CLAUDE.md`.

## 6. Yang SENGAJA tidak diganti (risiko bila diganti)

| Identifier | Alasan |
|---|---|
| `UNIT_NAME_GUYUB = "Traktir Kopi Brokado"` di `lib/trakteer.ts` | Nilai itu dicocokkan dengan data Trakteer eksternal. Hanya nama konstanta yang berbau guyub, bukan nilainya. Ganti nama konstanta boleh, nilai jangan |
| `PREVIEW_COOKIE = "guyub_preview"` | Mengganti nama cuma mengakhiri mode pratinjau yang sedang aktif (tidak merusak data). Aman diganti, dengan dampak itu |
| Kunci `localStorage` `guyub-install-tunda`, `sessionStorage` `guyub-update-ditutup` | Mengganti cuma membuat banner muncul sekali lagi. Aman, tidak wajib |
| Cache SW `guyub-shell-v2` | Mengganti nama memicu pembuangan cache lama saat `activate`, justru sehat. Pastikan logika buang cache versi lama membuang nama lama |
| Nama paket `guyub` di `package.json`, nama Worker `name = "guyub"` di `wrangler.toml` | **Jangan diganti.** Mengganti nama Worker membuat Worker baru, memutus secrets, route, dan riwayat deploy |
| Repo, folder `~/projects/guyub`, `.env.*`, nama service | Tidak terlihat pengguna |
| `src/generated/prisma-workerd/*` | Hasil generate (di-ignore git), mengikuti komentar skema |
| Kata "paguyuban" (enum `TenantJenis.paguyuban`) | Kata Indonesia umum, bukan brand |

## 7. Konfigurasi domain (kondisi saat ini)

| Titik | Lokasi | Nilai saat ini di `main` |
|---|---|---|
| Route Worker | `wrangler.toml` | `guyub.thedreamcompany.space/*`, zona `thedreamcompany.space` |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_URL` | `wrangler.toml` `[vars]` dan GitHub secrets (build) | domain lama |
| Better Auth `trustedOrigins`, `baseURL` | `src/lib/auth.ts` | domain lama, plus `127.0.0.1:3000` dan `localhost:3000` |
| Sitemap, robots, `metadataBase`/OG | `sitemap.ts`, `robots.ts`, `layout.tsx` | `NEXT_PUBLIC_URL` dengan fallback domain lama |
| Canonical halaman | `tentang/page.tsx` (`"/tentang"` relatif ke `metadataBase`) | ikut `metadataBase` |
| VAPID subject | `lib/push.ts` | `NEXT_PUBLIC_URL` |
| Google OAuth | Google Console (di luar repo) | redirect URI domain lama, harus ditambah |
| Webhook Xendit / Trakteer | dashboard Xendit dan Trakteer (di luar repo) | URL domain lama, harus dipindah |
| Dev | `next.config.ts` `allowedDevOrigins: dev.thedreamcompany.space` | tetap (tunnel dev) |
| Redirect lama ke baru | Cloudflare Redirect Rule di zona lama (dashboard, bukan repo) | belum ada |

Catatan: branch `dev` sudah berisi persiapan ke `guyub.my.id` (commit `9202b93`). Itu digantikan oleh `komunita.my.id`
(lihat bagian 9).

Tidak ada: email verifikasi, reset password, CORS khusus, cookie domain eksplisit (cookie terikat host).

## 8. Risiko

1. **Semua pengguna logout** saat host berubah (cookie terikat host). Tidak menghapus akun atau data.
2. **Login Google gagal** bila origin dan redirect URI baru belum ada di Google Console sebelum deploy.
3. **Webhook** Xendit dan Trakteer: 301 mengubah POST menjadi GET. Pindahkan URL di dashboard masing-masing SEBELUM redirect aktif.
4. **Push subscription** terikat origin. Pengguna di domain baru harus mengaktifkan push ulang, dan PWA yang sudah terpasang dari domain lama tidak otomatis pindah.
5. **Zona baru pending** beberapa jam, `wrangler deploy` ke route baru gagal sebelum zona aktif.
6. **Host lama harus tetap punya DNS proxied**, kalau tidak redirect tidak jalan (522).
7. **Beban CPU Worker**: landing page baru harus tetap statis, tanpa query DB dan tanpa render gambar saat request.
8. **Tema warna** menyentuh seluruh UI sekaligus. Tangkapan layar sebelum dan sesudah wajib untuk membandingkan kontras.
9. **Konflik gaya**: judul SEO yang diminta memakai em dash. Aturan proyek melarang em dash, jadi dipakai titik dua.
10. **Forgot password tidak ada**: login hanya Google, jadi butir QA itu tidak berlaku.
11. **Landing page**: jangan klaim "gratis penuh" atau "tidak ada iklan" (CLAUDE.md §4.10), jangan mengarang testimoni atau statistik.

## 9. Rencana implementasi

| Fase | Isi | Catatan |
|---|---|---|
| 1 | Audit (dokumen ini) | selesai |
| 2 | Logo dan aset lewat skill `bantuan-chatgpt` (imagegen) | hasil mentah di `~/projects/chatgpt-gambar/`, diolah jadi set aset di `public/brand/` |
| 3 | UI: token warna, `GuyubLogo` jadi `KomunitaLogo`, teks di semua berkas bagian 5, manifest, SW | tanpa mengubah API, skema, atau identifier bagian 6 |
| 4 | Landing page 11 bagian, statis, tanpa data karangan | memakai tangkapan layar nyata dari app |
| 5 | Domain: `wrangler.toml`, `auth.ts`, env, GitHub secrets, runbook DNS dan Google Console dan webhook | **tanpa mengubah DNS dan tanpa deploy**, menunggu persetujuan |
| 6 | SEO: title, deskripsi, canonical, OG, Twitter card, JSON-LD Organization dan SoftwareApplication, sitemap, robots | statis |
| 7 | Tes: tsc, lint, build, Playwright, cek manual halaman, pemeriksaan isolasi tenant lewat kode | sebutkan apa yang tidak bisa diotomasi (login Google asli) |
| 8 | Dokumen: IMPLEMENTATION, BRAND-ASSETS, DOMAIN-MIGRATION, QA-REPORT, ROLLBACK-PLAN | |

Aturan kerja: semua di branch `dev`. Tidak ada merge ke `main`, deploy, atau perubahan DNS tanpa persetujuan Iman.
Backup data tidak diperlukan karena tidak ada operasi yang menyentuh database. Bila itu berubah, backup dulu.
