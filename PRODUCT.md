# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pengurus (ketua, wakil ketua, bendahara, sekretaris) dan anggota biasa dari
tenant berbasis keluarga besar, RT, atau paguyuban di Indonesia. Situasi
awal: catatan kas/tabungan/silsilah keluarga selama ini cuma hidup di grup
WhatsApp atau buku tulis satu orang, dan raib/berantakan begitu pengurus
ganti. Pekerjaan yang mereka selesaikan: mencatat & mengecek kas, tabungan,
qurban joinan, arisan, dan silsilah keluarga secara transparan, bisa diakses
semua anggota kapan saja, tanpa training atau instalasi apa pun.

## Product Purpose

Guyub adalah aplikasi multi-tenant (satu akun bisa punya role beda di tenant
beda) untuk keluarga besar/RT/paguyuban mencatat kas, tabungan, qurban
joinan, arisan, silsilah keluarga, dan laporan, dalam satu tempat yang bisa
diakses semua anggota. Sukses = pengurus tidak lagi jadi satu-satunya
pemegang catatan (data tidak raib saat pengurus ganti), dan anggota tidak
lagi curiga-curiga soal ke mana uang kas terpakai.

## Positioning

Beda dari catatan manual (WhatsApp/buku tulis): riwayat tersimpan permanen
lepas dari siapa pun pengurusnya, transparan buat semua anggota tanpa perlu
scroll chat, dan data tiap tenant terisolasi penuh (tenant lain tidak bisa
mengintip). Model bisnisnya juga beda dari kompetitor umum: fitur inti
gratis selamanya, didanai infrastrukturnya oleh pengembang secara pribadi,
dibantu donasi sukarela (Trakteer) dari pengguna, bukan iklan atau jual data.

## Operating Context

- Alur onboarding: ketua daftar tenant pakai akun Google → approve platform
  owner → undang anggota lewat link WhatsApp → pengurus konfirmasi member.
- Peran per tenant: Ketua/Wakil Ketua, Bendahara (satu-satunya yang boleh
  catat uang: kas/tabungan/qurban/infaq/dana kegiatan), Sekretaris (anggota
  & silsilah), Anggota biasa.
- "Nyawa platform": tiap tenant punya masa aktif (`nyawaSampai`) yang
  bertambah tiap kali ada yang traktir lewat Trakteer (default Rp1.000/hari
  masa aktif, dikonfigurasi lewat env `TRAKTEER_RUPIAH_PER_HARI`, sengaja
  tidak dipublikasikan sebagai angka pasti di copy publik). Trakteer di
  Guyub sengaja tidak eksklusif/dipatok unit — sifatnya "traktir kopi"
  sukarela ke pengembang secara pribadi (Iman), jumlah bebas ditentukan
  pendukung.
- Landing page publik (`src/app/page.tsx`) sudah punya section pendek
  "Dukung Pengembang" (id `#dukung`) berisi `TrakteerModal`, dan section
  "Data Tenant Anda Aman" yang menyinggung sekilas model gratis+donasi.
  Halaman "Tentang" baru ini memperluas narasi itu jadi halaman utuh,
  sebagian kontennya reuse dari index.

## Capabilities and Constraints

- **Dilarang keras** klaim absolut "gratis penuh selamanya" atau "tidak ada
  iklan/tidak dijual" di copy publik manapun (termasuk halaman Tentang ini).
  Alasannya: Iman berencana jualan solusi IT ke tenant-tenant ramai di
  kemudian hari (tier "Berbayar 1": upload bukti transfer; "Berbayar 2":
  payment gateway otomatis), jadi copy tidak boleh mengunci komitmen jangka
  panjang. Frasa yang aman & sudah dipakai: "fitur dasarnya bisa dipakai
  gratis, fitur tambahan menyusul buat tenant yang memang butuh."
  Klaim isolasi data per tenant ("data tidak bisa diintip tenant lain")
  tetap aman dan boleh ditegaskan.
- **Tidak menyebutkan nominal biaya infrastruktur riil** di halaman Tentang
  (dikonfirmasi user): tetap general seperti copy landing sekarang
  ("disewa pakai uang pribadi pengembang"), jangan mengarang angka bulanan
  server/domain.
  **Tidak ada milestone/target donasi** ditampilkan (dikonfirmasi user):
  ajakan dukung tetap general, bukan progress bar menuju angka tertentu.
- Tema visual wajib: "hunian rumah yang indah", hangat/homey, bukan
  dashboard korporat generik; ikon-ikon menenangkan konsisten di seluruh app.
- Bahasa: Indonesia santai/hangat, mengikuti gaya copy index yang sudah ada
  (lihat contoh nada di `src/app/page.tsx`: "Suka sama Guyub? Boleh banget
  traktir kami buat dukung pengembangannya.").
- Halaman Tentang perlu ditautkan dari footer (kolom "Lainnya", sejajar
  "Dukung Pengembang") **dan** dari header nav index (dikonfirmasi user).
- Dev server wajib di `127.0.0.1:3000` (lihat CLAUDE.md), production di
  `guyub.thedreamcompany.space`, deploy otomatis lewat GitHub Actions.

## Brand Commitments

- Nama produk: **Guyub**. Warna brand: `--primary` (oranye kecoklatan hangat,
  lihat `globals.css`), font tunggal `Plus Jakarta Sans` (self-hosted via
  `next/font`, dipakai site-wide, dipilih 15 Sep 2026 buat kehangatan +
  dukungan `tabular-nums`, bukan Fraunces/Sora seperti draf awal CLAUDE.md).
- Guyub adalah kontribusi dari **The Dream Company** (link footer index ke
  `https://product.thedreamcompany.space`), bukan brand berdiri sendiri.
- "Nyawa Platform"/istilah "traktir" untuk Trakteer sudah jadi istilah baku
  di seluruh app (`NyawaBar`, notifikasi, dashboard tenant) — pertahankan
  istilah ini di halaman Tentang, jangan ganti jadi istilah lain
  ("donasi"/"dukungan" boleh dipakai sebagai sinonim penjelas, bukan
  pengganti).

## Evidence on Hand

- Statistik real-time yang sudah dipakai di index: jumlah tenant `approved`
  dan jumlah anggota aktif (query Prisma langsung, bukan angka statis).
  Boleh dipakai ulang di Tentang.
- Daftar donatur nyata via `DonaturList`/`trakteerDonasi` (dashboard tenant)
  — tidak ditarik ke halaman Tentang publik kecuali diminta eksplisit
  (privasi donatur per-tenant belum dikonfirmasi untuk tampil di halaman
  publik lintas-tenant).
- Screenshot produk asli di `public/screenshots/` (kas-mobile.png,
  qurban-mobile.png, silsilah-mobile.png, laporan-mobile.png), sudah dipakai
  index lewat komponen `Mockup`.
- **Tidak ada** testimoni pengguna, studi kasus, atau angka biaya
  infrastruktur riil yang terdokumentasi — jangan fabrikasi salah satu dari
  ini.

## Product Principles

1. Transparansi di atas segalanya: setiap klaim (jumlah tenant, anggota,
   donatur) pakai data nyata dari database, bukan angka tempelan.
2. Jangan pernah mengunci komitmen bisnis jangka panjang lewat copy publik
   (no "gratis selamanya", no "tanpa iklan mutlak").
3. Nada hangat & personal ("keluarga", "traktir", "nyawa") di atas nada
   korporat/formal, konsisten dari index sampai halaman dalam.
4. Ajakan dukung dibingkai sebagai kontribusi sukarela ke sesama, bukan
   tekanan/urgensi buatan (tidak ada milestone/target palsu).
