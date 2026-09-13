# CLAUDE.md — Instruksi Proyek untuk Claude Code

> File ini otomatis dibaca Claude Code sebagai konteks project setiap kali sesi dimulai di root repo ini. Taruh file ini di root repo (sejajar dengan `package.json`), dan taruh `arisan-app-spec.md` di `docs/`.

## Sebelum mulai kerja
1. Baca `docs/arisan-app-spec.md` secara penuh — itu spec fungsional lengkap (entities, fitur, fase, open questions).
2. Baca folder `./references/app/` — source code schoolcommunity.space (aplikasi kas kelas milik Iman). Contek pola UI, struktur folder, dan alur yang relevan, **kecuali** bagian yang eksplisit beda di spec (terutama alur onboarding anggota — lihat §4.1 spec).
3. Kerjakan sesuai urutan Fase di §8 spec. Jangan lompat fase kecuali diminta.
4. Kalau ketemu keputusan yang belum jelas dan masuk daftar §7 spec (open questions), **stop dan tanya Iman** — jangan asumsi sendiri untuk hal-hal yang sudah ditandai open.

## Stack & Infrastruktur (wajib, jangan diganti tanpa konfirmasi)

| Komponen | Pilihan |
|---|---|
| Framework | Next.js |
| Compute/hosting | Cloudflare Workers |
| Database | Neon Postgres |
| Asset storage | Cloudinary (image & dokumen) |
| Repo & CI/CD | GitHub + GitHub Actions |
| Analytics/SEO | Google Search Console, Google Analytics |
| Dev server | `http://127.0.0.1:3000` (wajib port ini — akan di-tunnel manual oleh Iman ke `http://dev.thedreamcompany.space`) |
| Production | `https://guyub.thedreamcompany.space` di Cloudflare |
| PWA | Wajib installable di Android, template mobile-first |

## Tugas prioritas di awal (Fase 0)
- Desain **icon aplikasi & favicon yang iconic** — tema visual "hunian rumah yang indah", icon-icon menenangkan (lihat §4.12 spec)
- Setup PWA dasar (manifest.json, service worker, icon set berbagai ukuran)
- Setup skema database (Neon Postgres) mengikuti model data di §3 spec — perhatikan `User` (global) terpisah dari `Membership` (role per tenant), ini krusial untuk fitur multi-tenant multi-role

## Hal yang HARUS diperhatikan (business rules sensitif)
- **Onboarding anggota tenant BEDA dari school app** — jangan pakai pola self-register bebas via link publik. Ikuti alur di §4.1 spec (invite via WA + konfirmasi pengurus).
- **Copy landing page**: jangan klaim "gratis penuh" atau "tidak ada iklan/tidak dijual" secara mutlak — lihat §4.10 spec untuk alasannya (rencana bisnis jangka panjang Iman).
- **Multi-tenant multi-role**: satu akun (satu email) bisa punya role berbeda di tenant berbeda secara bersamaan — pastikan model data & auth mendukung ini sejak awal (§2 & §3 spec), jangan hardcode 1 user = 1 role.
- Fitur berbayar (upload bukti transfer, payment gateway) baru masuk di Fase 4-5 — jangan dikerjakan lebih awal, dan billing mechanism-nya masih open question (§7).

## Struktur folder yang diharapkan
```
docs/arisan-app-spec.md   # spec fungsional lengkap
references/app/           # source code schoolcommunity.space (referensi, read-only)
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
