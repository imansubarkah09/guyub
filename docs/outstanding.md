# Outstanding: perlu dikerjakan/diputuskan Iman

Status kode: Fase 0-5 (docs/arisan-app-spec.md §8) semua sudah dibangun. Daftar di
bawah ini hal yang butuh kredensial, keputusan, atau percobaan manual dari Iman.

## 1. Deploy Cloudflare Workers (13 Sep 2026: sudah live)

Worker aktif di `https://guyub.thedreamcompany.space` dan
`https://guyub.imansubarkah09.workers.dev`.

Sudah beres:

- `wrangler.jsonc` sudah punya `routes` custom domain `guyub.thedreamcompany.space`.
- 16 secret runtime sudah naik ke Worker lewat `wrangler secret bulk .env.production`.
- Skema DB produksi (Neon `ep-autumn-art-...`, terpisah dari dev) sudah dimigrasi,
  status `migrate status` bersih.
- `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` sudah ada di GitHub Actions
  secrets, jadi push ke `main` memicu build plus deploy.
- `.github/workflows/ci-cd.yml` kini menjalankan `prisma migrate deploy` ke DB
  produksi sebelum build, dan mengoper `NEXT_PUBLIC_URL` serta
  `NEXT_PUBLIC_TRAKTEER_SLUG` saat build (dua ini di-inline saat build, bukan rahasia).

Sisa yang perlu perhatian:

- [ ] Endpoint direct/unpooled Neon produksi (`ep-autumn-art-...` tanpa `-pooler`)
      tidak bisa dihubungi dari mesin lokal (Prisma P1001) padahal TCP 5432-nya
      terbuka. Sementara ini semua migrasi dijalankan lewat URL pooled, termasuk di
      GitHub Actions. Cek di dashboard Neon kalau mau dibereskan.
- [ ] Login Google di produksi: pastikan redirect URI
      `https://guyub.thedreamcompany.space/api/auth/callback/google` terdaftar di
      Google Cloud Console. Login asli tidak bisa diotomasi dari sisi Claude.
- [ ] `?error=state_mismatch` saat mencoba login (13 Sep 2026). Diperiksa ulang lewat
      curl: `POST /api/auth/sign-in/social` berhasil membuat state di tabel
      `Verification` dan callback dengan state itu lolos pemeriksaan state (gagal
      berikutnya karena `code` dummy). Artinya jalurnya sehat sekarang. Dugaan kuat:
      percobaan login itu memakai state lama (dibuat sebelum migrasi DB produksi
      dijalankan) atau state sudah kedaluwarsa (umur state 10 menit, cookie 5 menit).
      Coba sekali lagi dari tab baru; kalau masih muncul, ambil log dengan
      `npx wrangler tail` saat login berlangsung.

## 2. Trakteer

- Slug dipakai `brokado` (satu akun Trakteer dengan Brokado, unit "Traktir Kopi
  Brokado"). `NEXT_PUBLIC_TRAKTEER_SLUG=brokado` sudah diisi di `.env.production`,
  `.env.development`, `.dev.vars`, dan workflow CI.
- Tarikan API Trakteer sudah ada: tombol "Tarik dari Trakteer" di `/admin/trakteer`
  memanggil `tarikDonasi()`, jadi donasi tetap masuk walau webhook gagal. Bentuk
  respons API sudah dicocokkan langsung ke API asli (HTTP 200, satu baris traktir).
- [ ] `TRAKTEER_WEBHOOK_TOKEN` di `.env.production` masih kosong, jadi endpoint
      `/api/webhooks/trakteer` selalu menolak dengan 401. Isi dengan token dari
      dashboard Trakteer, daftarkan callback ke
      `https://guyub.thedreamcompany.space/api/webhooks/trakteer`, lalu jalankan ulang
      `npx wrangler secret bulk .env.production`.
- [ ] Klik tombol "Tarik dari Trakteer" sekali sebagai uji nyata. Pencatatan ke DB
      belum pernah dijalankan end to end, baru bentuk respons APInya yang dicocokkan.

## 3. Xendit (Fase 5, bayar setoran tabungan otomatis)

- [ ] `XENDIT_API_KEY` dan `XENDIT_CALLBACK_TOKEN` di `.env.development` dan
      `.env.production` masih placeholder. Tombol "Bayar via Xendit" baru muncul kalau
      `XENDIT_API_KEY` sudah diisi nilai asli.
- [ ] Setelah API key asli didapat, daftarkan Invoice Callback URL di Xendit dashboard:
      `<NEXTAUTH_URL>/api/webhooks/xendit`, dan salin verification token-nya ke
      `XENDIT_CALLBACK_TOKEN`.
- [ ] Belum diverifikasi end to end dengan Xendit asli (baru logic webhooknya, pakai
      data simulasi). Coba satu pembayaran sungguhan di sandbox setelah keynya ada.
- [ ] **Kas dan Arisan belum punya jalur bayar via Xendit** (baru Tabungan). Kas
      dicatat pengurus langsung (tidak ada alur bayar dari anggota), dan Arisan belum
      punya ledger setoran per giliran sama sekali. Perlu didesain dulu kalau mau.

## 4. Keputusan bisnis (spec §7, open questions, belum pernah dijawab)

- [ ] Mekanisme billing untuk fitur berbayar (upload bukti transfer sudah aktif gratis
      untuk sekarang; payment gateway otomatis untuk tenant-paying-platform belum ada
      sama sekali). Langganan per tenant, bayar per fitur, atau one-time?
- [ ] Detail teknis link undangan anggota: sekali pakai, bisa dipakai berkali-kali
      (saat ini: berkali-kali sampai dicabut manual), atau ada masa berlaku (expiry)?
- [ ] Konfirmasi nama produk: "Guyub" final, atau ada nama lain untuk branding?
- [ ] Root/leluhur tertinggi silsilah keluarga: siapa yang jadi node pertama saat
      tenant baru dibuat? (saat ini: bebas, siapa saja tanpa parentId jadi root)
- [ ] Retensi/limit data untuk tenant yang di-suspend atau tidak aktif: dihapus setelah
      berapa lama, atau disimpan selamanya?

## 5. SEO / Analytics (Fase 2 §8, kodenya sudah ada tinggal isi env)

- [ ] `GOOGLE_SITE_VERIFICATION`: kode verifikasi HTML tag dari Google Search Console.
      Belum ada di `.env.production`, jadi meta verifikasinya tidak ikut ter-build.
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID`: measurement ID dari Google Analytics (GA4).
      Sama, belum ada di `.env.production` dan belum dioper di workflow CI.

## 6. Utang teknis kecil

- [ ] Dua migrasi lama (`20260913110540_tabungan_setoran_xendit` dan
      `20260913125656_arisan_undian_kegiatan_trakteer`) pernah diubah setelah
      diterapkan, jadi checksumnya tidak cocok dan `prisma migrate dev` minta reset
      database dev. Migrasi baru untuk sementara ditulis tangan lalu dijalankan dengan
      `migrate deploy`. Beres kalau dev database boleh di-reset.
