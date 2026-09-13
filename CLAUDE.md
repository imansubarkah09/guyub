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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes, APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev`, verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
