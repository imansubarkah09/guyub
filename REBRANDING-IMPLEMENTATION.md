# REBRANDING-IMPLEMENTATION

Commit di branch `rebrand-komunita` (folder `~/projects/komunita`, clone dari repo yang sama):
1. Audit dan aset logo (`REBRANDING-AUDIT.md`, `BRAND-ASSETS.md`, `public/brand/*`, `design/komunita-logo-source.png`).
2. Konfigurasi domain: `wrangler.toml` (route baru ditambah, route lama dipertahankan, `NEXTAUTH_URL`, `NEXT_PUBLIC_URL`), `src/lib/auth.ts` (trustedOrigins), fallback URL di `sitemap.ts`, `robots.ts`, `layout.tsx`, `push.ts`.
3. Tampilan: nama KOMUNITA di seluruh teks tampilan, `GuyubLogo` jadi `KomunitaLogo` (simbol K asli), token warna `globals.css`, `icon.svg`, `icon-192/512.png`, `apple-icon.png`, `favicon.ico`, `og-image.png`, manifest (nama, deskripsi, warna, ikon maskable), `theme-color`, roda arisan, `public/sw.js` (cache `komunita-shell-v1`).
4. Landing page 11 bagian (`src/app/page.tsx`), footer ("A product by The Dream Company"), tombol sticky.
5. SEO: title "KOMUNITA: Platform Manajemen Komunitas" (titik dua, bukan em dash, sesuai aturan proyek), deskripsi baru, canonical lewat `metadataBase`, Open Graph dan Twitter card, JSON-LD WebSite, Organization, SoftwareApplication, sitemap dan robots statis (tanpa query DB).

## Sengaja tidak diubah
Nama Worker dan paket `guyub`, folder upload Cloudinary `guyub/*`, kunci localStorage/sessionStorage, cookie `guyub_preview`, nilai unit Trakteer, nama tabel dan skema, kata "paguyuban" (jenis tenant).

## Dampak CPU/Neon
Tidak menambah query. Landing masih memakai 2 `count` yang sudah ada sebelumnya. Sitemap, robots, og-image, dan ikon statis. Tidak ada render gambar saat request.
