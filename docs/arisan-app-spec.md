# Spec & Fase Pengerjaan: Aplikasi Arisan Keluarga/RT/Paguyuban ("Guyub")

Versi: 0.2 (draft brainstorming, perlu review Iman sebelum dieksekusi Claude Code)
Referensi: https://schoolcommunity.space (aplikasi kas kelas milik Iman, source code-nya akan ditaruh di `./references/app/` untuk dicontek Claude Code)

## 1. Ringkasan

Platform SaaS untuk mengelola kas & tabungan komunitas non-sekolah: keluarga besar, RT, atau paguyuban. Beda utama dari schoolcommunity.space: tidak ada layer sub-tenant, dan **tidak full gratis**, ada fitur berbayar (upload bukti transfer, payment gateway) yang akan aktif seiring pertumbuhan.

## 2. Arsitektur Layer & Tenancy

```
Platform Owner (Iman)
  └─ Tenant (1 keluarga besar / 1 RT / 1 paguyuban)
       └─ Membership: 1 User bisa punya role berbeda di tenant berbeda
```

| Layer | Siapa | Catatan |
|---|---|---|
| Platform Owner | Iman | Approve/reject pendaftaran **tenant baru** via dashboard admin (mirip pola dashboard owner di school app), tanpa perlu dokumen pendukung |
| Tenant | 1 keluarga / RT / paguyuban | Data terisolasi per tenant, tidak bisa saling intip |
| User (global) | Akun berbasis email/Google | Satu akun, bisa ikut banyak tenant sekaligus |
| Membership | Keanggotaan user di 1 tenant | Role (ketua/bendahara/sekretaris/anggota) melekat di sini, bukan di User |

**Keputusan arsitektur, multi-tenant, multi-role per email:**
Satu email yang sama bisa jadi Ketua di arisan keluarga, Bendahara di arisan RT, dan Anggota di arisan paguyuban, karena role disimpan di `Membership` (per kombinasi user+tenant), bukan di `User`. `User` hanya identitas global (email, nama, foto).

## 3. Model Data Inti (draft)

| Entity | Deskripsi | Field kunci |
|---|---|---|
| `Tenant` | Satu keluarga/RT/paguyuban | jenis (keluarga/RT/paguyuban), status (pending/approved/suspended) |
| `TenantProfile` | Info tampil tenant | tenant_id, nama, logo_url (Cloudinary), alamat |
| `User` | Akun global (identitas lintas tenant) | email, nama, foto_profil |
| `Membership` | Keanggotaan user di 1 tenant | user_id, tenant_id, role(s), status (pending_confirmation/active/removed) |
| `Invitation` | Link undangan gabung tenant | tenant_id, token, dibuat_oleh (user_id pengurus), status |
| `FamilyNode` | Node silsilah keluarga | nama, parent_id, spouse_id, user_id (opsional) |
| `KasTransaksi` | Transaksi kas masuk/keluar | tanggal, jumlah, tipe, keterangan, dicatat_oleh |
| `TabunganTipe` | Jenis tabungan per tenant | nama (qurban/umroh/haji/dana kegiatan), mode (individual/pooled) |
| `TabunganSaldo` | Saldo tabungan | tabungan_tipe_id, user_id (null jika pooled), jumlah |
| `QurbanGroup` | Kelompok patungan qurban | jenis_hewan (sapi=7 jiwa / kambing=1 jiwa), target_per_jiwa, status |
| `QurbanSlot` | Slot jiwa dalam satu QurbanGroup | qurban_group_id, user_id, saldo_terkumpul, status (lunas/belum) |
| `Arisan` | Skema arisan (opsional per tenant) | periode, jumlah_setoran, status |
| `ArisanPeserta` | Peserta + urutan giliran | arisan_id, user_id, urutan (manual), status_dapat |
| `Laporan` | Snapshot laporan | periode, tenant_id, share_link, pdf_url (Cloudinary) |
| `TenantApprovalRequest` | Antrian approval tenant baru (oleh Iman) | tenant_id, status, catatan_owner |

## 4. Fitur per Modul

### 4.1 Onboarding: Tenant Baru vs Anggota Baru (2 level approval berbeda)

**Tenant baru:**
- Calon ketua daftar tenant (login Google, isi jenis tenant) → status `pending` → Iman approve/reject manual via dashboard admin, tanpa dokumen

**Anggota baru dalam tenant (BEDA dari school app, jangan pakai pola self-register bebas):**
- Prinsip: undangan yang sah adalah undangan yang disebar pengurus lewat WhatsApp (grup keluarga/RT/paguyuban atau chat personal), bukan link publik yang bisa ditemukan sembarang orang
- Usulan alur teknis (perlu konfirmasi Iman sebelum dikerjakan):
  1. Pengurus (ketua/bendahara/sekretaris) generate invite link dari dashboard tenant
  2. Pengurus sebar link itu sendiri secara manual via WA (bukan sistem yang broadcast)
  3. Calon anggota klik link → login Google → Membership otomatis berstatus `pending_confirmation`
  4. Pengurus tenant confirm dari dashboard sebelum anggota itu bisa lihat data tenant
- Ini memastikan tetap ada gerbang konfirmasi internal tenant, sesuai instruksi Iman

### 4.2 Struktur Pengurus & Peran

| Aksi | Ketua | Bendahara | Sekretaris | Anggota |
|---|---|---|---|---|
| Catat kas masuk/keluar | ✅ | ✅ | ❌ | ❌ |
| Kelola tabungan (set individual/pooled) | ✅ | ✅ | ❌ | ❌ |
| Atur urutan giliran arisan | ✅ | ✅ | ❌ | ❌ |
| Kelola data anggota & silsilah | ✅ | ❌ | ✅ | ❌ |
| Update profil tenant (nama/logo/alamat) | ✅ | ❌ | ✅ | ❌ |
| Confirm anggota baru | ✅ | ✅ | ✅ | ❌ |
| Generate & share laporan | ✅ | ✅ | ✅ | ❌ |
| Lihat semua data tenant (read-only) | ✅ | ✅ | ✅ | ✅ |

### 4.3 Silsilah Keluarga
- Tree hierarchy terpisah dari struktur pengurus, hubungan darah/pernikahan, bukan jabatan
- Contoh: Widodo → anak Desy → suami Arif, anak Fadil
- Butuh relasi parent-child **dan** pernikahan (bukan tree linear)
- Visual: diagram hierarchy dari 1 root/leluhur tertinggi tenant

### 4.4 Kas
- Bendahara catat transaksi manual; semua pengurus & anggota bisa lihat (transparan)

### 4.5 Tabungan (Qurban / Umroh / Haji / Dana Kegiatan)
- Ketua/bendahara set mode tiap jenis tabungan: `individual` atau `pooled`, bebas per tenant

### 4.6 Qurban Joinan (fitur gamifikasi khusus)
- 1 sapi = 7 jiwa, 1 kambing = 1 jiwa, target nominal per jiwa ditentukan tenant
- Progress ditampilkan menarik, contoh: *"Widodo & Arif sudah lunas, masih menunggu 5 orang lagi untuk qurban sapi ini"*
- **Desain**: animasi/icon sapi & kambing muncul saat halaman qurban dibuka, bagian dari tema visual §4.12

### 4.7 Arisan Giliran (opsional per tenant)
- Tenant bisa pilih pakai atau tidak; urutan giliran diatur manual oleh ketua/bendahara

### 4.8 Laporan & Sharing
- Export PDF, share via link read-only ke grup pengurus & grup keluarga/anggota

### 4.9 Notifikasi
- Channel: WhatsApp (blast/link share), prioritas dibanding email untuk MVP
- Trigger: reminder setoran, update progress qurban joinan, laporan baru terbit

### 4.10 Landing Page & Akses Publik
- Struktur & pola konten mengikuti schoolcommunity.space (before/after, langkah mulai, fitur per role, jaminan keamanan data)
- **Beda penting dari school app, copy harus disesuaikan:**
  - Jangan klaim "gratis penuh", jelaskan ada fitur dasar gratis + fitur berbayar (upload bukti transfer, payment gateway)
  - Jangan pakai klaim mutlak seperti "tidak ada iklan, tidak dijual" ala school app, Iman berencana jualan solusi IT ke tenant-tenant ramai di kemudian hari, jadi hindari over-promise yang mengunci komitmen jangka panjang
  - Klaim isolasi data per tenant (data tidak bisa diintip tenant lain) tetap aman dipakai
- Tombol Daftar/Masuk; detail fitur hanya terbuka setelah login
- Donasi sukarela via Trakteer, integrasi sama seperti di school app

### 4.11 Manajemen Profil Tenant
- Halaman khusus pengurus untuk update: nama tenant, logo (upload ke Cloudinary), alamat, dan daftar pengurus

### 4.12 Tema Visual & Branding
- Tema: seperti "hunian rumah yang indah", hangat, homey, bukan dashboard korporat generik
- Icon-icon menenangkan (calming) dipakai konsisten di seluruh aplikasi
- Halaman qurban: animasi/icon sapi & kambing (lihat §4.6)
- **Prioritas awal**: Claude Code diminta segera membuatkan icon aplikasi & favicon yang iconic, selaras tema di atas

### 4.13 PWA (wajib)
- Installable ke Android (manifest.json + service worker + icon set berbagai ukuran)
- Template mobile-first di semua halaman

## 5. Monetisasi (tier fitur)

| Tier | Fitur | Status |
|---|---|---|
| Gratis (MVP) | Tenant, kas, tabungan, silsilah, arisan giliran manual, qurban joinan, laporan PDF+share | Gratis + donasi sukarela (Trakteer) |
| Berbayar 1 | Upload bukti transfer/foto setoran | Diaktifkan setelah tenant makin banyak |
| Berbayar 2 (advanced) | Integrasi payment gateway otomatis | Fase lanjut |

Catatan: mekanisme billing (langganan per tenant / bayar per fitur / one-time) belum dibahas, lihat §7.

## 6. Stack Teknis & Infrastruktur

| Komponen | Pilihan |
|---|---|
| Framework | Next.js |
| Compute/hosting | Cloudflare Workers |
| Database | Neon Postgres |
| Asset storage (image & dokumen) | Cloudinary |
| Repo & CI/CD | GitHub repo + GitHub Actions |
| Analytics & SEO | Google Search Console, Google Analytics |
| Dev server | Wajib jalan di `http://127.0.0.1:3000`, di-tunnel ke `http://dev.thedreamcompany.space` untuk akses publik/testing mobile |
| Production domain | `https://guyub.thedreamcompany.space`, deploy di Cloudflare |
| PWA | Wajib, lihat §4.13 |
| Referensi kode | Source code schoolcommunity.space akan ditaruh Iman di `./references/app/`, Claude Code boleh mencontek pola UI/struktur dari situ, kecuali di bagian yang sudah eksplisit beda di spec ini (terutama onboarding §4.1) |

## 7. Asumsi & Open Questions (perlu konfirmasi Iman sebelum eksekusi)
- Detail teknis link undangan: sekali pakai / bisa dipakai berkali-kali / ada masa berlaku (expiry)?
- Konfirmasi nama produk: "Guyub" (diambil dari nama subdomain) atau ada nama lain untuk branding?
- Root/starting point silsilah keluarga: siapa jadi "leluhur tertinggi" saat tenant dibuat pertama kali?
- Retensi/limit data untuk tenant yang di-suspend atau tidak aktif
- Mekanisme billing untuk fitur berbayar: langganan per tenant, bayar per fitur, atau one-time?

## 8. Fase Pengerjaan untuk Claude Code

### Fase 0: Setup & Scaffolding (termasuk branding awal)
- Setup repo GitHub + CI/CD via GitHub Actions
- Inisialisasi Next.js, konfigurasi deploy ke Cloudflare Workers
- Setup Neon Postgres + skema migrasi untuk entities di §3
- Setup Cloudinary untuk upload asset (logo tenant, foto profil, dokumen)
- Setup dev server di `127.0.0.1:3000`, dokumentasikan tunnel ke `dev.thedreamcompany.space`
- Baca & pelajari `./references/app/` (source schoolcommunity.space) sebagai bahan pola UI/struktur
- **Prioritas tinggi**: desain icon aplikasi & favicon yang iconic sesuai tema §4.12
- Setup PWA dasar (manifest.json, service worker, icon set)
- Setup auth (Google login) dengan model User (global) + Membership (per tenant), lihat §2 & §3

### Fase 1: MVP Core
- Registrasi tenant + approval flow Iman (dashboard admin)
- Alur undangan & konfirmasi anggota baru sesuai §4.1
- Manajemen role per Membership (permission matrix §4.2)
- Manajemen Profil Tenant (§4.11): nama, logo, alamat, daftar pengurus
- Modul Kas (transaksi masuk/keluar, riwayat transparan)
- Modul Tabungan dasar dengan toggle individual/pooled

### Fase 2: Fitur Lanjutan MVP
- Silsilah keluarga (tree builder + visualisasi hierarchy)
- Qurban Joinan dengan progress gamifikasi + animasi sapi/kambing
- Arisan Giliran opsional (setup periode, urutan manual, tracking)
- Laporan: generate PDF + share link
- Landing page publik dengan copy sesuai §4.10 (tanpa over-promise)
- Integrasi Google Search Console & Google Analytics

### Fase 3: Notifikasi
- Integrasi WhatsApp blast/link share untuk reminder setoran & update progress qurban

### Fase 4: Tier Berbayar 1
- Upload bukti transfer/foto setoran + validasi bendahara
- Billing/paywall mechanism menunggu keputusan di §7

### Fase 5: Tier Berbayar 2 (Advanced)
- Integrasi payment gateway otomatis untuk setoran kas/tabungan/arisan
