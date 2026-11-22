# QA-REPORT (22 Nov 2026, branch rebrand-komunita)

## Lolos (otomatis)
- `tsc --noEmit`: 0 error.
- `pnpm lint`: 0 error, 1 peringatan `no-img-element` di `t/[tenantId]/profil/page.tsx` (tidak disentuh perubahan ini).
- Playwright, 16 tes (desktop dan Pixel 7): `/`, `/login`, `/register`, `/cari` render tanpa error console dan tanpa overflow horizontal, tautan Masuk/Daftar, back/forward, manifest PWA dan ikon, service worker aktif.
- Pemeriksaan visual (tangkapan layar) landing desktop dan mobile, halaman login mobile: nama, warna, logo benar.
- Kontras warna dihitung: teks utama 7,2:1, teks redup 4,9:1, putih di atas hijau 7,8:1.
- Tidak ada em dash di kode sumber yang diubah.

## Belum diuji (jujur)
- Login Google asli (Google memblokir otomasi). Harus dicoba Iman di domain baru.
- Seluruh halaman di belakang login: dashboard, anggota, kas, tabungan, arisan, qurban, silsilah, laporan, role, isolasi tenant. Perubahan di area itu hanya teks dan warna, tidak ada logika, otorisasi, atau query yang diubah, tetapi tampilannya belum dilihat langsung.
- `pnpm build` dan `cf:build` (workerd) belum dijalankan. Wajib sebelum merge.
- Tangkapan layar di `public/screenshots/` (bagian mockup landing) masih tampilan lama berwarna terakota. Perlu diambil ulang dari akun yang sudah login.
- Forgot password dan email verification: tidak ada di aplikasi (login hanya Google).
- Redirect, SSL, dan webhook di domain baru: menunggu deploy.

## Keamanan
- Tidak ada secret baru di repo atau frontend. Otorisasi dan isolasi tenant tidak diubah.
- `trustedOrigins` ditambah `https://komunita.my.id`, domain lama dipertahankan sampai cutover.

## Kesimpulan
Belum dinyatakan siap produksi. Syarat sebelum merge: build lolos, tampilan halaman login-only dicek, tangkapan layar landing diperbarui.
