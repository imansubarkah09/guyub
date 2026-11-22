# ROLLBACK-PLAN

Database tidak disentuh rebranding (tanpa migrasi), jadi rollback hanya kode dan konfigurasi.

| Kondisi | Tindakan |
|---|---|
| Sebelum merge ke `main` | Tidak ada yang perlu dikembalikan. Production masih versi Guyub. Abaikan branch `rebrand-komunita` |
| Sesudah deploy, tampilan bermasalah tetapi login jalan | `git revert -m 1 <merge-commit>` di `main`, push, deploy otomatis. Route lama masih ada, domain lama tetap melayani |
| Login di domain baru gagal | Balikkan `NEXTAUTH_URL` dan `NEXT_PUBLIC_URL` (secrets dan `wrangler.toml`) ke domain lama, deploy. Route domain lama harus masih ada (jangan hapus sebelum login terbukti) |
| Redirect Rule 301 sudah aktif lalu bermasalah | Nonaktifkan rule di dashboard zona lama. Browser yang sempat meng-cache 301 bisa tetap diarahkan sementara |
| Webhook Xendit/Trakteer gagal | Kembalikan URL webhook ke domain lama di dashboard masing-masing (route lama masih aktif) |
| Cache service worker | Nama cache diganti ke `komunita-shell-v1`, cache lama dibuang otomatis saat activate. Rollback kode memakai nama lama dan juga membuang cache baru |

Titik tanpa jalan balik mudah: setelah route lama dihapus (langkah 6 DOMAIN-MIGRATION) dan 301 aktif, rollback butuh menambah route lama lagi dan menonaktifkan rule.
Backup data tidak diperlukan untuk perubahan ini. Bila nanti ada perubahan yang menyentuh data, buat dump Neon (branch atau pg_dump) lebih dulu.
