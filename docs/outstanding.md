# Outstanding — perlu dikerjakan/diputuskan Iman

Status kode: Fase 0-5 (docs/arisan-app-spec.md §8) semua sudah dibangun dan di-push ke
`main`. Daftar di bawah ini murni hal yang butuh kredensial atau keputusan dari Iman —
tidak ada yang menunggu Claude Code.

## 1. Deploy — Cloudflare Workers

- [ ] **`CLOUDFLARE_API_TOKEN`** — belum ada di GitHub Actions secrets. Tanpa ini job
      `deploy` di `.github/workflows/ci-cd.yml` akan gagal di setiap push ke `main`.
      Buat di Cloudflare dashboard → My Profile → API Tokens → Create Token → template
      "Edit Cloudflare Workers", lalu:
      `gh secret set CLOUDFLARE_API_TOKEN --repo imansubarkah09/thedreamcompany-guyub`
- [ ] Domain produksi `guyub.thedreamcompany.space` belum di-binding ke Worker-nya
      (`wrangler.jsonc` belum punya `routes`/custom domain). Perlu ditambahkan setelah
      DNS domain itu diarahkan ke Cloudflare.
- [ ] Database produksi — `.env.production` saat ini **masih menunjuk ke Neon DB yang
      sama dengan `.env.development`** (belum ada Neon project terpisah untuk
      production). Setelah dibuat, jalankan ulang seed owner:
      `node --env-file=.env.production scripts/db-ops-seed-owner.mjs`

## 2. Xendit (Fase 5 — bayar setoran tabungan otomatis)

- [ ] `XENDIT_API_KEY` dan `XENDIT_CALLBACK_TOKEN` di `.env.development`/`.env.production`
      masih placeholder. Tombol "Bayar via Xendit" baru muncul kalau `XENDIT_API_KEY`
      sudah diisi nilai asli.
- [ ] Setelah API key asli didapat, daftarkan Invoice Callback URL di Xendit dashboard:
      `<NEXTAUTH_URL>/api/webhooks/xendit`, dan salin verification token-nya ke
      `XENDIT_CALLBACK_TOKEN`.
- [ ] Belum sempat diverifikasi end-to-end dengan Xendit asli (baru diverifikasi logic
      webhook-nya pakai data simulasi) — coba satu pembayaran sungguhan di sandbox
      setelah key-nya ada.
- [ ] **Kas dan Arisan belum punya jalur bayar via Xendit** (baru Tabungan) — Kas
      dicatat pengurus langsung (tidak ada alur bayar dari anggota), dan Arisan belum
      punya ledger setoran per giliran sama sekali. Perlu didesain dulu kalau mau.

## 3. Keputusan bisnis (spec §7 — open questions, belum pernah dijawab)

- [ ] Mekanisme billing untuk fitur berbayar (upload bukti transfer sudah aktif gratis
      untuk sekarang; payment gateway otomatis untuk tenant-paying-platform belum ada
      sama sekali) — langganan per tenant, bayar per fitur, atau one-time?
- [ ] Detail teknis link undangan anggota — sekali pakai, bisa dipakai berkali-kali
      (saat ini: berkali-kali sampai dicabut manual), atau ada masa berlaku (expiry)?
- [ ] Konfirmasi nama produk: "Guyub" final, atau ada nama lain untuk branding?
- [ ] Root/leluhur tertinggi silsilah keluarga — siapa yang jadi node pertama saat
      tenant baru dibuat? (saat ini: bebas, siapa saja tanpa parentId jadi root)
- [ ] Retensi/limit data untuk tenant yang di-suspend atau tidak aktif — dihapus
      setelah berapa lama, atau disimpan selamanya?

## 4. SEO / Analytics (Fase 2 §8, kodenya sudah ada tinggal isi env)

- [ ] `GOOGLE_SITE_VERIFICATION` — kode verifikasi HTML tag dari Google Search Console.
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` — measurement ID dari Google Analytics (GA4).

## 5. Opsional

- [ ] `NEXT_PUBLIC_TRAKTEER_SLUG` — kalau mau tombol donasi sukarela di landing page
      aktif, isi slug creator Trakteer Guyub (belum ada akunnya).
