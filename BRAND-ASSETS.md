# BRAND-ASSETS: KOMUNITA

## Asal logo
Logo dibuat dengan skill `bantuan-chatgpt` (imagegen, akun ChatGPT Iman) pada 22 Nov 2026, satu gambar, tanpa
berkas proyek dikirim. Sumber mentah: `design/komunita-logo-source.png` (salinan dari `~/projects/chatgpt-gambar/20261122-165604-1.png`).
Konsep: huruf K dari satu batang dan dua lengan yang berujung node (koneksi antar anggota), satu node berwarna aksen.

Set aset diturunkan dari gambar itu dengan skrip (alpha dari latar putih, warna dirata-ratakan ke palet, ukuran dengan Pillow).
SVG dihasilkan dengan trace potrace dari gambar yang sama, jadi tepinya sedikit membulat dibanding vektor gambar tangan.
Kalau suatu hari ada logo vektor asli dari desainer, ganti berkas di `public/brand/` dengan nama yang sama.

## Palet
Deep Forest Green #153D35, Primary Green #245B50, Soft Sage #DCE9DF, Warm Cream #F7F6F0, Charcoal #252D29, White #FFFFFF.

## Berkas di `public/brand/`
| Berkas | Fungsi |
|---|---|
| komunita-logo.svg / .png | Primary logo (simbol + wordmark), latar transparan |
| komunita-logo-light-bg.png | Primary di atas krem #F7F6F0 |
| komunita-logo-dark-bg.png | Versi putih/sage di atas hijau #153D35 |
| komunita-logo-mono(.svg, -black.png, -white.png) | Satu warna |
| komunita-icon.svg / .png, komunita-icon-mono.svg | Simbol K saja |
| komunita-icon-square-transparent.png | Simbol 1024 px transparan |
| komunita-app-icon-1024/512/192.png | Ikon aplikasi persegi, latar hijau |
| komunita-app-icon-maskable-512.png | Padding kecil untuk `purpose: maskable` |
| komunita-apple-touch-icon-180.png | iOS Layar Utama |
| komunita-avatar-512.png | Avatar media sosial (aman dipotong bulat) |
| favicon.ico | 16, 32, 48 px |
