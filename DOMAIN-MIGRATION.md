# DOMAIN-MIGRATION: guyub.thedreamcompany.space ke komunita.my.id

## Status (22 Nov 2026)
- Zona `komunita.my.id` dibuat di akun Cloudflare Iman, tipe full, status **active** (ID zona `ee3e5ac2af173aff42a58824f40aefad`).
- Record DNS: `AAAA komunita.my.id 100::` proxied (placeholder untuk route Worker).
- Kode di branch `rebrand-komunita` sudah menunjuk ke domain baru. **Belum dideploy.** Production tetap dari `main`.

## Urutan kerja (jangan dibalik)
1. GitHub secrets repo: ganti `NEXTAUTH_URL` dan `NEXT_PUBLIC_URL` ke `https://komunita.my.id` (build CI membaca dari secrets, bukan `wrangler.toml`).
2. Google Console, OAuth client: tambahkan origin `https://komunita.my.id` dan redirect URI `https://komunita.my.id/api/auth/callback/google`. Jangan hapus yang lama dulu.
3. Dashboard Xendit: Invoice Callback URL jadi `https://komunita.my.id/api/webhooks/xendit`. Dashboard Trakteer: webhook jadi `https://komunita.my.id/api/webhooks/trakteer`. Lakukan SEBELUM redirect 301 aktif (301 mengubah POST jadi GET).
4. Merge `rebrand-komunita` ke `main` (setelah tes lolos dan Iman setuju), pantau deploy: `cd ~/projects/komunita && gh run watch <id-run> --exit-status`.
5. Verifikasi: `https://komunita.my.id/api/version` 200, landing 200, login Google asli (dicoba Iman sendiri di browser).
6. Setelah login terbukti jalan: hapus blok route `guyub.thedreamcompany.space/*` dari `wrangler.toml`, deploy lagi.
7. Buat Redirect Rule 301 di zona `thedreamcompany.space` (dashboard Cloudflare, bukan repo): host eq `guyub.thedreamcompany.space`, target `concat("https://komunita.my.id", http.request.uri.path)`, status 301, preserve query string. Host lama harus tetap punya DNS proxied, kalau tidak hasilnya 522.
8. Nyalakan Always Use HTTPS di zona baru, tambah DNS `www` bila diinginkan.
9. SEO: daftarkan `komunita.my.id` di Google Search Console dan Bing Webmaster (verifikasi DNS TXT), kirim `https://komunita.my.id/sitemap.xml`, lalu Change of Address dari properti guyub lama. Pertahankan 301 minimal 1 tahun.

## Dampak ke pengguna
- Semua pengguna logout sekali (cookie terikat host). Akun dan data tidak berubah.
- Push notification harus diaktifkan ulang di domain baru. PWA lama di domain lama tidak otomatis pindah.
- Tautan undangan dan laporan lama tetap bekerja lewat 301 (GET).

## Catatan
- `NEXTAUTH_URL` dipatok ke domain baru, jadi login di domain lama gagal begitu deploy naik. Itu diharapkan.
- Dev: `dev.thedreamcompany.space` (tunnel) tetap di `allowedDevOrigins`, tidak berubah.
- Token Cloudflare tidak disimpan di repo. Token sempat dibagikan lewat chat, sebaiknya di-roll setelah selesai.
