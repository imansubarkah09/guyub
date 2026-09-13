# PROMPT KERJA: Revamp UI/UX, RBAC Audit & Fitur Lengkap Aplikasi "Guyub"

> **Cara pakai dokumen ini (baca dulu sebelum mulai kerja):**
> 1. Simpan seluruh isi file ini ke repo pada path `docs/tasks/2026-09-revamp-uiux-dan-fitur.md` (buat foldernya kalau belum ada).
> 2. Kerjakan **semua** section di bagian 7 secara berurutan sebagai fase terpisah. Setiap fase harus di-commit terpisah dengan pesan commit yang jelas.
> 3. Setiap kali satu fase selesai, **centang checklist "Definition of Done"** di bagian 10 pada file markdown ini juga (edit langsung file-nya), supaya progress selalu sinkron dengan kondisi kode.
> 4. **Jangan claim "selesai"** ke Iman kalau ada satu pun poin di checklist bagian 10 yang belum tercentang dan terbukti jalan (bukan asumsi).
> 5. Kalau menemukan ambiguitas yang tidak terjawab oleh dokumen ini, buat keputusan yang paling masuk akal, **tulis keputusan itu beserta alasannya** di section "Keputusan Tambahan" pada laporan akhir (lihat bagian 11), jangan berhenti kerja hanya untuk bertanya.
> 6. Di akhir, kirim laporan sesuai format bagian 11. Iman akan re-inspect aplikasi berdasarkan laporan itu, jadi laporan harus akurat dan bisa diverifikasi.

---

## 1. Ringkasan Tugas

Aplikasi "Guyub" (pencatatan kas & tabungan arisan Keluarga/RT/Paguyuban, multi-tenant) saat ini **fungsional tapi UI/UX sangat sederhana** (form HTML polos, tanpa hierarki visual, tanpa mobile optimization nyata) dan **punya beberapa fitur yang belum ada sama sekali** (lihat bagian 3). Tugas kamu:

1. **Redesign total UI/UX** jadi terlihat modern, futuristik, profesional, dan **mobile-first** (mayoritas user akan install sebagai PWA di HP Android).
2. **Audit & perbaiki RBAC** di semua halaman dan semua endpoint API, pastikan tidak ada role yang bisa melakukan aksi di luar izinnya, termasuk lewat direct API call (bukan cuma disembunyikan di UI).
3. **Bangun fitur Platform Owner** (tenant list, approval tenant baru, dan fitur **Preview as Role** & **Preview as User**) supaya platform owner bisa mengintip tampilan semua tenant tanpa perlu akun terpisah.
4. **Lengkapi fitur-fitur yang masih kosong/dangkal**: Ringkasan/Dashboard, Arisan (status bayar + jadwal), Silsilah (search + highlight), Laporan (multi-tab + export + share), serta **fitur baru**: Infaq & Shodaqoh, dan Dana Kegiatan (pengeluaran).
5. **Tambah notifikasi bell**, **menu profil user** (nama + avatar + no. HP + logout), dan **tombol install PWA** yang benar-benar berfungsi.

---

## 2. Konteks & Stack Teknis (tidak berubah: ikuti yang sudah ada)

- Framework: **Next.js**, deploy ke **Cloudflare Workers**.
- Database: **Neon Postgres**.
- Asset (image/dokumen): **Cloudinary**.
- Repo di GitHub, CI/CD via GitHub Actions.
- Dev server wajib jalan di `http://127.0.0.1:3000`, di-tunnel ke `http://dev.thedreamcompany.space`.
- Domain produksi: `https://guyub.thedreamcompany.space`.
- Model tenancy: **platform owner** (Iman) di level atas → **tenant** (1 tenant = 1 keluarga/RT/paguyuban) → **anggota** dengan role: `ketua`, `bendahara` (1-2 orang), `sekretaris` (1-2 orang), `anggota`. Satu orang **bisa punya lebih dari satu role sekaligus** dalam satu tenant (sudah diimplementasikan sebagai checkbox di halaman Anggota, jangan diubah jadi single-select).
- Satu akun email bisa jadi member di banyak tenant sekaligus dengan role berbeda-beda per tenant.
- Manifest PWA (`manifest.webmanifest`) **sudah ada** dan service worker sudah didukung browser, yang belum ada adalah **tombol/prompt Install** yang berfungsi dan pengecekan bahwa manifest (icons, `display: standalone`, `theme_color`) sudah lengkap dan valid untuk installability di Android.

---

## 3. Temuan Audit Kondisi Saat Ini (per halaman: hasil inspeksi langsung tanggal 13 Sep 2026)

Gunakan ini sebagai baseline. Jangan menghapus fitur yang sudah berfungsi baik (misal sistem role-checkbox di Anggota, dan progress bar per-jiwa di Qurban), **redesign tampilannya**, tapi **pertahankan logikanya** kecuali diminta diubah eksplisit di bagian 7.

| Halaman | URL pattern | Kondisi sekarang | Masalah utama |
|---|---|---|---|
| Ringkasan | `/t/{tenantId}` | Cuma nama tenant, jumlah anggota, alamat, daftar pengurus | **Tidak ada data keuangan sama sekali**, tidak sesuai kebutuhan (lihat 7.3) |
| Kas | `/t/{tenantId}/kas` | Saldo Kas + form input transaksi (Masuk/Keluar, jumlah, keterangan, bukti transfer) langsung tampil & bisa disubmit | **RBAC leak**: form ini tampil dan bisa disubmit oleh user dengan role `ketua` saja (bukan `bendahara`), dites langsung dengan akun Iman yang rolenya ketua |
| Tabungan | `/t/{tenantId}/tabungan` | Hanya form buat jenis tabungan baru (nama + Individual/Pooled). Tidak ada listing saldo & detail existing tabungan | Fitur "lihat saldo tabungan per orang" belum ada |
| Qurban | `/t/{tenantId}/qurban` | Sudah cukup baik: bisa buka joinan kambing(1 jiwa)/sapi(7 jiwa) + target rupiah per jiwa, listing progress bar per jiwa per orang, tombol "Catat" setoran, link "edit" | **RBAC leak sama**: tombol "Catat"/"edit" tampil untuk role `ketua`. Belum ada pesan gamified rekap per grup qurban. Belum ada agregasi "total kambing/sapi & rupiah" di level tenant |
| Arisan | `/t/{tenantId}/arisan` | Hanya form buat arisan baru (periode + jumlah setoran per giliran). Belum ada arisan aktif di tenant contoh ini | Belum ada: tracking siapa sudah/belum bayar per periode, saldo arisan berjalan, giliran/urutan pemenang, jadwal tanggal & tempat pertemuan berikutnya |
| Silsilah | `/t/{tenantId}/silsilah` | List hierarki dengan indentasi + simbol ⚭ untuk pasangan, link edit per node, form tambah node (nama, orang tua, pasangan) | Tidak ada search, tidak ada default filter ke pohon milik user yang login, tidak ada highlight posisi user |
| Laporan | `/t/{tenantId}/laporan` | Input periode + tombol "Buat Laporan" (single flat report) | Tidak multi-tab, tidak ada export PDF, tidak ada share WhatsApp, tidak ada public link laporan ringkas |
| Anggota | `/t/{tenantId}/anggota` | Generate link undangan + share WhatsApp + cabut; listing anggota dengan checkbox multi-role + Simpan, **ini sudah bagus, pertahankan** | Perlu dicek: siapa yang boleh mengubah role siapa (lihat matriks RBAC bagian 5) |
| Profil (tenant) | `/t/{tenantId}/profil` | Nama tenant, alamat, logo, ini profil **tenant**, bukan profil **user** | Tidak ada profil personal user (no. HP, avatar), ini beda kebutuhan dari menu dropdown di top-right bar (lihat 7.13) |
| Top bar | semua halaman | Nama tenant (kiri), **email mentah** user (kanan) + tombol "Keluar". Klik di email tidak melakukan apa-apa | Tidak ada nama tampilan, tidak ada avatar, tidak ada dropdown, **tidak ada lonceng notifikasi** |
| Platform Owner area | tidak ditemukan | Tidak ada halaman/menu untuk melihat daftar semua tenant, approve tenant baru, atau "preview as", Iman saat ini hanya bisa masuk sebagai anggota biasa di tenant miliknya | Harus dibangun dari nol (lihat 7.1 & 7.2) |
| Mobile responsiveness | semua halaman | Sidebar kiri fixed, tidak collapse otomatis di layar kecil, tidak ada bottom-nav mobile | Tidak sesuai requirement "mobile first" |
| PWA install | - | Manifest ada, tapi tidak ada tombol Install yang eksplisit di UI | Harus ditambahkan (lihat 7.14) |

---

## 4. Prinsip Desain UI/UX Baru

- **Tone visual**: hangat seperti "hunian rumah yang indah" (warm home vibe) tapi terlihat **futuristik & profesional**, kombinasikan warm palette (bisa lanjutkan base warna terracotta/cream yang sudah ada) dengan elemen modern: card dengan subtle shadow/elevation, rounded corners konsisten, micro-interaction (transisi halus, skeleton loading, empty state yang ilustratif bukan halaman kosong polos), iconography konsisten (gunakan icon set seperti Lucide/Phosphor, bukan campur emoji + teks seperti sekarang).
- **Mobile-first**: desain dan test dari breakpoint 360–430px dulu, baru scale up ke tablet/desktop. Sidebar kiri fixed **wajib diganti** jadi: bottom navigation bar (untuk 4-5 menu paling sering dipakai) + menu "Lainnya"/hamburger drawer untuk sisanya di mobile; sidebar tetap boleh dipakai di desktop/tablet (≥1024px).
- **Kategorisasi menu** wajib (lihat bagian 6), jangan tampilkan 9+ menu flat sejajar seperti sekarang, itu membingungkan.
- **Qurban**: pertahankan/percantik ikon & mini-animasi kambing 🐐 dan sapi 🐄 (bisa custom illustration/SVG, bukan cuma emoji polos) sesuai keputusan awal.
- **Empty state & onboarding**: karena "platform owner tidak perlu mengajarkan pengguna menggunakan platform", setiap halaman kosong (belum ada data) harus punya empty-state yang **self-explanatory**: ilustrasi/icon + 1 kalimat penjelasan + call-to-action jelas, tanpa butuh training dari platform owner.
- Semua form input harus punya validasi jelas (inline error, bukan alert browser), loading state saat submit, dan konfirmasi sukses (toast/snackbar).

---

## 5. RBAC: Matriks Peran & Izin

Terapkan matriks ini **di server-side (API/route handler), bukan cuma sembunyikan tombol di UI**. UI hanya boleh menyembunyikan aksi yang memang tidak diizinkan sebagai lapisan kedua (defense in depth), tapi validasi utama harus di backend supaya tidak bisa dibobol lewat direct API call/devtools.

Role tenant: `ketua`, `bendahara`, `sekretaris`, `anggota` (bisa lebih dari satu role sekaligus → izin = union/OR dari semua role yang dimiliki). Role platform: `platform_owner` (khusus Iman, cross-tenant).

| Aksi | Anggota | Sekretaris | Bendahara | Ketua | Platform Owner (mode preview) |
|---|---|---|---|---|---|
| Lihat Ringkasan, Kas, Tabungan, Qurban, Arisan, Laporan (read-only) | ✅ | ✅ | ✅ | ✅ | ✅ (read-only, lihat 7.2) |
| Catat/edit transaksi Kas (Masuk/Keluar) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Buka jenis tabungan baru / catat setoran tabungan & Qurban | ❌ | ❌ | ✅ | ❌ | ❌ |
| Catat Infaq & Shodaqoh per pertemuan | ❌ | ❌ | ✅ | ❌ | ❌ |
| Catat Dana Kegiatan (pengeluaran) + pilih sumber dana | ❌ | ❌ | ✅ | ❌ | ❌ |
| Buat/edit jadwal & tempat Arisan berikutnya, atur urutan giliran | ❌ | ✅ | ✅ | ✅ | ❌ |
| Tandai anggota sudah/belum bayar arisan periode berjalan | ❌ | ❌ | ✅ | ❌ | ❌ |
| Generate/cabut link undangan anggota baru | ❌ | ✅ | ❌ | ✅ | ❌ |
| Approve anggota baru join tenant | ❌ | ✅ | ❌ | ✅ | ❌ |
| Ubah role anggota (checkbox ketua/bendahara/sekretaris/anggota) | ❌ | ✅ (kecuali mengangkat diri sendiri jadi ketua) | ❌ | ✅ | ❌ |
| Tambah/edit node Silsilah milik sendiri (diri, pasangan, anak) | ✅ (hanya cabang sendiri) | ✅ (semua) | ❌ | ✅ (semua) | ❌ |
| Edit/hapus node Silsilah milik orang lain | ❌ | ✅ | ❌ | ✅ | ❌ |
| Export Laporan ke PDF & share ke WhatsApp | ❌ (bisa lihat & download hasil publish, tidak generate) | ✅ | ✅ | ✅ | ❌ |
| Edit Profil tenant (nama, alamat, logo) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Edit profil pribadi (nama tampilan, no. HP, avatar) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Akses Platform Owner area (list tenant, approval tenant baru) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Preview as Role / Preview as User (lihat 7.2) | ❌ | ❌ | ❌ | ❌ | ✅ |

> Catatan penting: **Platform Owner dalam mode preview selalu read-only**, walaupun role yang di-preview adalah bendahara/ketua. Kalau Iman memang anggota asli di sebuah tenant (dengan role asli, misal ketua di arisan keluarganya sendiri), maka saat masuk **sebagai dirinya sendiri** (bukan mode preview) dia tunduk ke izin role aslinya di tenant itu, bukan otomatis full-access karena dia platform owner.

**Wajib**: buat test/QA checklist manual (atau automated test kalau ada waktu) yang login sebagai tiap role dan mencoba tiap aksi di tabel atas, baik lewat UI maupun lewat direct API call (misal pakai curl/Postman dengan token role rendah ke endpoint tulis data keuangan), pastikan server menolak dengan 403, bukan cuma UI yang sembunyikan tombolnya.

---

## 6. Struktur Navigasi & Kategorisasi Menu Baru

Ganti 9 menu flat sejajar dengan kategori berikut (boleh disesuaikan penamaan tapi struktur/pengelompokan ini wajib dipertahankan supaya tidak membingungkan):

```
🏠 Ringkasan (dashboard)

💰 Keuangan
   ├─ Kas
   ├─ Tabungan
   ├─ Qurban
   ├─ Infaq & Shodaqoh   [BARU]
   └─ Dana Kegiatan       [BARU]

🎉 Arisan
   ├─ Status Bayar & Saldo
   └─ Jadwal Pertemuan

🌳 Silsilah Keluarga

📊 Laporan

👥 Anggota & Undangan

⚙️ Profil Tenant   (khusus ketua)
```

Top bar (semua halaman, semua role): logo/nama tenant (kiri, klik → kembali ke Ringkasan), lonceng notifikasi + nama & avatar user dengan dropdown (kanan), lihat 7.12 & 7.13.

Untuk **Platform Owner**, tambahkan entry point terpisah (misal `/admin` atau tombol khusus yang hanya muncul untuk akun platform owner) yang terpisah dari struktur menu tenant di atas, lihat 7.1.

---

## 7. Spesifikasi Fitur per Halaman

### 7.1 Platform Owner Area (BARU: belum ada sama sekali)

Buat area admin terpisah, misalnya di `/admin`, hanya bisa diakses akun dengan flag `platform_owner = true`.

Wajib ada:
- **Daftar semua tenant** (nama, tipe: keluarga/RT/paguyuban, jumlah anggota, tanggal daftar, status: `pending_approval` / `active` / `suspended`).
- **Approval tenant baru**: tombol Approve/Reject untuk tenant berstatus `pending_approval` (sesuai keputusan: approval manual tanpa dokumen pendukung, cukup review nama & alamat).
- Search/filter tenant by nama.
- Dari daftar tenant ini, tiap baris ada tombol **"Preview"** yang membawa ke fitur 7.2.

### 7.2 Preview as Role & Preview as User (BARU)

Dari halaman detail tenant di admin area (7.1), platform owner bisa:
- **Preview as Role**: pilih salah satu dari `ketua` / `bendahara` / `sekretaris` / `anggota` → masuk ke tampilan tenant tersebut **seolah-olah** login sebagai role itu (data yang ditampilkan adalah data asli tenant, tapi kalau ada beberapa orang dengan role sama, tampilkan generic/role-level view, bukan data personal spesifik satu individu kecuali dipilih spesifik).
- **Preview as User**: pilih salah satu anggota spesifik dari daftar anggota tenant tersebut → masuk melihat tampilan **persis seperti yang dilihat user itu**, termasuk data personal seperti checklist dashboard miliknya, saldo tabungan miliknya, dsb.
- Selama mode preview aktif, tampilkan **banner/pita jelas** di atas layar (misal warna kontras, sticky di top): `"Mode Preview, melihat sebagai [Role/Nama User] di [Nama Tenant]. Semua aksi tulis dinonaktifkan."` dengan tombol "Keluar dari Preview" yang selalu terlihat.
- Semua tombol/aksi tulis (submit form, tombol catat/edit/hapus) **wajib disabled** selama mode preview, baik di UI maupun ditolak di server side kalau tetap dicoba lewat API (validasi session preview di backend, bukan cuma flag di frontend).

### 7.3 Ringkasan / Dashboard

Halaman ini beda tampilan tergantung siapa yang login, tapi strukturnya:

**Untuk semua role (ringkasan umum tenant, transparan untuk semua)**:
- Card **Saldo Kas** (Rp).
- Card **Saldo Tabungan Qurban**: total rupiah terkumpul + breakdown jumlah kambing (X ekor, tiap ekor = 1 jiwa) dan sapi (Y ekor, tiap ekor = 7 jiwa) yang sudah *lunas penuh* vs yang masih *terbuka/proses*, plus pesan gamified per grup (contoh format wajib: **"Widodo & Arif sudah lunas, masih menunggu 5 orang lagi untuk qurban sapi"**).
- Card **Saldo Arisan berjalan** (total terkumpul periode ini) + siapa giliran penerima berikutnya (kalau arisan giliran dipakai di tenant ini).
- Card **Saldo Infaq & Shodaqoh** (total terkumpul, akumulatif semua pertemuan).
- Card **Progress Tabungan per orang**, ringkas (misal top summary "N dari M anggota sudah menabung bulan ini"), detail lengkap ada di halaman Tabungan.

**Khusus untuk user yang login (personal)**:
- **Checklist / mission list**, outstanding tasks pribadi, contoh wajib (implementasikan logicnya, bukan cuma teks statis, cek kondisi data user beneran):
  - Kalau `no_hp` user masih kosong → tampilkan item: *"Lengkapi nomor WhatsApp Anda di halaman profil"* (klik → buka dropdown/modal profil, lihat 7.13).
  - Kalau user belum punya node di Silsilah tenant ini → *"Anda belum memiliki silsilah keluarga, buat silsilah keluarga Anda sendiri"* (klik → ke halaman Silsilah, form tambah).
  - Kalau tenant punya program tabungan Qurban aktif dan user belum ikut setoran apa pun → *"Anda belum join tabungan qurban, segera berpartisipasi untuk mendapat ridho dari Allah"* (klik → ke halaman Qurban).
  - Tambahkan checklist serupa untuk kondisi lain yang masuk akal (misal belum bayar arisan periode berjalan padahal sudah ikut arisan).
  - Item yang sudah terpenuhi hilang otomatis dari list (jangan pakai state manual "sudah dismiss", tapi cek kondisi data real-time).
- **Detail saldo tabungan pribadi user itu sendiri** (semua jenis tabungan yang diikuti + progress masing-masing).

### 7.4 Kas

- Perbaiki RBAC: form catat transaksi hanya submit-able oleh `bendahara` (server-side enforced). Role lain lihat read-only: saldo + riwayat transaksi (list, bukan cuma angka saldo doang seperti sekarang, tambahkan riwayat/mutasi kas kalau belum ada).
- Redesign: saldo sebagai hero card besar, riwayat transaksi sebagai list/table dengan filter tanggal.

### 7.5 Tabungan (umum, di luar Qurban)

- Tambahkan **listing semua jenis tabungan** yang sudah dibuat di tenant itu (nama, tipe individual/pooled, total saldo terkumpul).
- Klik satu jenis tabungan → detail: kalau individual, breakdown saldo **per orang** dengan progress bar (mirip pola yang sudah ada di Qurban); kalau pooled, tampilkan total saldo + riwayat setoran siapa nyetor berapa.
- Form setoran/catat hanya untuk `bendahara`.

### 7.6 Qurban

- Pertahankan logika yang sudah ada (buka joinan kambing/sapi, progress per jiwa).
- Perbaiki RBAC: tombol "Catat" setoran & "edit" hanya untuk `bendahara`.
- Tambahkan **rekap agregat di atas halaman**: total kambing (X ekor lunas / Y ekor terbuka), total sapi (X ekor lunas / Y ekor terbuka, dengan sub-progress jiwa terisi), total rupiah terkumpul keseluruhan.
- Tambahkan pesan gamified otomatis per grup qurban yang masih terbuka (format sesuai contoh di 7.3).

### 7.7 Arisan

- **Status bayar per periode**: setelah arisan dibuat, tampilkan tabel/list semua anggota tenant dengan status "Sudah Bayar ✅" / "Belum Bayar ⏳" untuk periode berjalan, **terlihat oleh siapapun** (transparan sesuai request), tapi hanya `bendahara` yang bisa **mengubah** status bayar seseorang.
- **Saldo arisan berjalan**: total terkumpul dari yang sudah bayar di periode ini, tampilkan jelas berapa yang akan diterima pemenang periode berikutnya.
- **Urutan giliran/pemenang**: tampilkan siapa gilirannya sekarang dan antrian berikutnya (urutan diatur manual oleh ketua/bendahara, bukan random sistem, sediakan UI untuk drag-reorder atau input urutan manual).
- **Jadwal pertemuan berikutnya (BARU)**: field tanggal + lokasi/tempat untuk pertemuan arisan berikutnya, bisa diedit oleh `ketua`/`sekretaris`/`bendahara`, ditampilkan mencolok di halaman ini dan di Ringkasan (card "Arisan berikutnya: [tanggal] di [tempat]").

### 7.8 Infaq & Shodaqoh (BARU)

- Menu baru di kategori Keuangan.
- Konsep: setiap pertemuan arisan/rutin, dikumpulkan infaq & shodaqoh seikhlasnya (nominal tidak tetap).
- Form catat: pilih/isi **tanggal pertemuan** (bisa dikaitkan ke pertemuan arisan yang sama kalau ada), jumlah terkumpul, keterangan opsional. Hanya `bendahara` yang bisa catat.
- Tampilkan **riwayat per pertemuan** (tanggal → jumlah terkumpul) dan **saldo akumulatif total** di atas (saldo ini berkurang kalau dipakai sebagai sumber Dana Kegiatan, lihat 7.9).

### 7.9 Dana Kegiatan / Pengeluaran (BARU)

- Menu baru untuk mencatat **pengeluaran** kegiatan tenant, misal "Jumat Berkah", "Santunan Anak Yatim 2026", dll.
- Form catat pengeluaran (hanya `bendahara`):
  - Nama kegiatan (free text).
  - **Sumber dana**: dropdown pilih dari pool yang tersedia (Saldo Kas / Saldo Infaq & Shodaqoh / saldo jenis Tabungan lain yang memang boleh dipakai untuk kegiatan, misal "Dana Kegiatan" kalau ada jenis tabungan bernama itu).
  - Jumlah pengeluaran (Rp), tanggal, keterangan, bukti opsional.
  - **Validasi**: jumlah tidak boleh melebihi saldo pool sumber yang dipilih saat itu.
- Saat disimpan: **otomatis mengurangi saldo pool sumber yang dipilih** (contoh: kegiatan "Jumat Berkah" ambil dari Saldo Kas → Saldo Kas berkurang sejumlah itu; kegiatan "Santunan Anak Yatim 2026" ambil dari Saldo Infaq & Shodaqoh → saldo itu yang berkurang, Kas tidak terpengaruh).
- Tampilkan riwayat semua Dana Kegiatan (nama kegiatan, sumber dana, jumlah, tanggal), read-only untuk semua role.

### 7.10 Silsilah

- Tambahkan **search bar** di atas halaman: cari berdasarkan nama, hasil pencarian menampilkan pohon silsilah yang relevan (bukan cuma satu baris nama, tapi konteks pohonnya: orang tua, pasangan, anak-anaknya).
- **Default saat halaman dibuka** (tanpa search): tampilkan pohon silsilah milik user yang sedang login (cabang yang menghubungkan dirinya).
- **Highlight** node milik user yang login (misal background warna beda / border tebal / badge "Anda") supaya begitu buka halaman langsung sadar posisinya (contoh: "oh saya adalah bapak dari... dan anak dari... dan suami dari...").
- Kalau user belum punya node sama sekali → tampilkan empty state dengan CTA "Buat silsilah Anda" (juga muncul sebagai checklist item di Ringkasan, lihat 7.3).
- Pertahankan sistem yang sudah ada: relasi parent-child dan pasangan (⚭), form tambah node.
- RBAC penambahan/edit node: lihat matriks bagian 5 (anggota biasa hanya bisa tambah/edit cabang sendiri).

### 7.11 Laporan

- **Multi-tab** dalam satu halaman Laporan, tab-nya:
  1. Saldo Kas
  2. Saldo Tabungan (semua jenis, exclude qurban & dana kegiatan kalau dipisah kategorinya, sesuaikan supaya tidak duplikat dengan tab lain)
  3. Saldo/Progress Tabungan Qurban
  4. Saldo Arisan & Status Bayar (siapa sudah/belum bayar periode ini)
  5. Saldo Infaq & Shodaqoh
- Tiap tab bisa difilter by periode (bulan/tahun), tampilan tabel + ringkasan angka di atas.
- **Export ke PDF**: tombol per tab atau export gabungan semua tab jadi satu PDF laporan.
- **Share**:
  - Tombol "Share ke Grup WhatsApp Pengurus".
  - Tombol "Share ke Grup WhatsApp Keluarga/RT/Paguyuban".
  - Keduanya generate pesan WhatsApp berisi ringkasan singkat + **link ke halaman laporan publik** (lihat poin berikut).
- **Halaman laporan publik** (tanpa login), URL unik per laporan/periode:
  - Hanya menampilkan **ringkasan saldo uang masuk dan uang keluar** (angka agregat, TIDAK ada detail transaksi individu, TIDAK ada nama-nama anggota, TIDAK ada data personal apa pun).
  - Di bawah ringkasan, tampilkan ajakan: *"Untuk melihat detail lengkap, daftar/masuk sebagai anggota"* dengan tombol ke halaman daftar/login.
  - Pastikan endpoint ini **tidak bocor data sensitif**, audit ulang response API-nya, jangan cuma sembunyikan di frontend.
  - Generate hanya boleh oleh `bendahara`/`ketua`/`sekretaris` (lihat matriks); anggota biasa bisa lihat hasil publish tapi tidak generate baru.

### 7.12 Notifikasi (Lonceng, BARU)

- Icon lonceng di top bar kanan (semua halaman, semua role), dengan badge jumlah notifikasi belum dibaca.
- Klik → dropdown/panel list notifikasi terbaru, urut terbaru di atas, tandai dibaca saat dibuka/diklik.
- Trigger notifikasi minimal untuk event berikut (buat sistemnya generik supaya gampang nambah event baru nanti):
  - Anggota baru disetujui join tenant → notif ke yang bersangkutan: *"Bendahara [Nama] menyetujui Anda bergabung"* (nama pengurus yang approve, dinamis).
  - Role user berubah → *"Anda diset menjadi [Role] Arisan oleh [Nama]"* (dinamis sesuai role & siapa yang ubah).
  - Ada transaksi Kas/Tabungan/Qurban baru dicatat (opsional broadcast ke pengurus).
  - Jadwal arisan berikutnya baru dibuat/diubah → broadcast ke semua anggota tenant.
  - Ada anggota baru mendaftar dan menunggu approval → notif ke `ketua`/`sekretaris`.
- Simpan sebagai data (bukan cuma toast sekali muncul) supaya history-nya tetap ada saat dibuka lagi nanti.

### 7.13 Profil Pengguna (dropdown top-right, BARU)

- Ganti tampilan top-right dari **email mentah** jadi: **nama tampilan user** + **avatar** (default avatar standar kalau belum upload foto, boleh pakai avatar Google kalau login via Google OAuth dan tersedia, atau inisial-based avatar sebagai fallback).
- Klik nama/avatar → buka dropdown/modal berisi:
  - Detail profil: nama, email (read-only), **nomor HP/WhatsApp** (bisa diisi/edit, field ini yang dicek di checklist dashboard 7.3), avatar (bisa upload/ganti).
  - Tombol **Simpan**.
  - Tombol **Keluar** (logout), pindahkan dari posisi terpisah sekarang jadi di dalam dropdown ini.

### 7.14 PWA & Tombol Install

- Audit `manifest.webmanifest`: pastikan ada `name`, `short_name`, `icons` (minimal 192x192 & 512x512, termasuk versi maskable), `theme_color`, `background_color`, `display: "standalone"`, `start_url` yang benar.
- Implementasikan listener `beforeinstallprompt` di client, simpan event-nya, dan tampilkan **tombol "Install Aplikasi"** yang jelas (misal di dropdown profil 7.13, atau banner dismissible di dashboard) yang memicu `prompt()` saat diklik.
- Untuk browser yang tidak fire `beforeinstallprompt` (misal iOS Safari), tampilkan instruksi manual singkat sebagai fallback ("Tap Share → Add to Home Screen").
- Test hasil install: pastikan setelah diinstall, app buka dalam mode standalone (tanpa address bar browser) dan icon di homescreen benar.

---

## 8. Model Data Tambahan yang Perlu Ditambahkan (panduan, kamu yang desain skema detailnya)

Entity/field baru yang kemungkinan besar dibutuhkan (sesuaikan dengan skema Postgres yang sudah ada, jangan duplikasi kalau sudah ada yang serupa):

- `tenant.status` (`pending_approval` / `active` / `suspended`), kalau belum ada.
- `user.no_hp`, `user.avatar_url`, `user.display_name` (kalau belum ada).
- `user.is_platform_owner` (boolean flag).
- `arisan_periode.jadwal_tanggal`, `arisan_periode.jadwal_tempat`.
- `arisan_pembayaran` (relasi anggota ↔ periode arisan ↔ status bayar & tanggal bayar).
- `infaq_shodaqoh` (tenant_id, tanggal_pertemuan, jumlah, keterangan, dicatat_oleh).
- `dana_kegiatan` (tenant_id, nama_kegiatan, sumber_dana_type + sumber_dana_id, jumlah, tanggal, keterangan, bukti_url).
- `notifikasi` (user_id, tenant_id, tipe, pesan, is_read, created_at, metadata jsonb untuk data dinamis seperti nama aktor).
- `laporan_publik` (token/slug unik, tenant_id, periode, snapshot data ringkas saldo masuk/keluar, generated_at, generated_by).

---

## 9. Checklist Keamanan Wajib

- [ ] Semua endpoint write (POST/PUT/PATCH/DELETE) untuk data keuangan (Kas, Tabungan, Qurban, Infaq & Shodaqoh, Dana Kegiatan, Arisan pembayaran) memvalidasi role `bendahara` di server, bukan cuma cek di client.
- [ ] Endpoint manajemen anggota/role memvalidasi role `ketua`/`sekretaris` di server.
- [ ] Session "Preview as Role/User" tidak bisa dipakai untuk request write apa pun, tervalidasi di middleware/server, bukan cuma UI disable.
- [ ] Endpoint laporan publik tidak mengembalikan field sensitif (nama anggota, nominal per transaksi individu, no. HP, dll), cek response JSON mentahnya, bukan cuma tampilan.
- [ ] Tidak ada IDOR: user tenant A tidak bisa akses data tenant B lewat manipulasi ID di URL/API.
- [ ] Platform owner area (`/admin` atau setara) tidak bisa diakses user biasa walau tahu URL-nya (redirect/403).
- [ ] File upload (bukti transfer, avatar, logo) divalidasi tipe & ukuran file di server.

---

## 10. Definition of Done: Self-Audit Checklist (centang sebelum lapor selesai)

> Dicentang berdasarkan hasil uji otomatis `scripts/db-ops-e2e.mjs` (Playwright,
> browser sungguhan, 31 pemeriksaan, semua LULUS), bukan asumsi. Screenshot ada
> di `docs/tasks/screenshots/`.

- [x] Redesign UI/UX selesai di semua halaman, terlihat konsisten, teruji di viewport mobile (412px, Pixel 7) dan desktop (1280px). 11 halaman diverifikasi tidak scroll horizontal.
- [x] Bottom navigation (4 menu + Lainnya) & drawer mobile berfungsi, sidebar desktop tetap ada, diuji di dua viewport.
- [x] RBAC matriks bagian 5 terimplementasi & tervalidasi server-side. Semua jalur tulis lewat satu choke point `requireWrite()`/`requireMemberWrite()`.
- [x] Platform Owner area: list tenant + approve/reject tenant baru berfungsi; hanya platform owner yang bisa membuka (role tenant dapat 404).
- [x] Preview as Role & Preview as User berfungsi, read-only, banner preview jelas, form tulis hilang di UI dan ditolak server saat dipaksa.
- [x] Ringkasan/Dashboard menampilkan semua card sesuai 7.3 dengan data real, termasuk checklist personal yang dihitung dari kondisi data asli.
- [x] Kas: RBAC fix (hanya bendahara) + riwayat transaksi + filter tanggal.
- [x] Tabungan: listing + detail per jenis + saldo per orang berfungsi.
- [x] Qurban: RBAC fix + rekap agregat + pesan gamified otomatis.
- [x] Arisan: status bayar per anggota per putaran, saldo berjalan, urutan giliran (naik/turun), jadwal tanggal & tempat, sesuai role.
- [x] Infaq & Shodaqoh: menu baru, catat per pertemuan, saldo akumulatif berfungsi (diuji tulis lewat UI).
- [x] Dana Kegiatan: pilih sumber dana, auto-deduct saldo sumber, validasi tidak melebihi saldo, ketiganya diuji end-to-end (pengeluaran melebihi saldo ditolak, yang sah masuk & saldo infaq berkurang).
- [x] Silsilah: search by nama (menampilkan pohon dari leluhur), default pohon user login, highlight "Anda".
- [x] Laporan: 5 tab, export PDF, share WhatsApp (pengurus & keluarga), halaman publik ringkas & aman, terbit lewat UI dan halaman publik terbukti tidak memuat nama/email anggota.
- [x] Notifikasi bell: badge unread, list notifikasi, trigger event (disetujui, role berubah, tenant baru, jadwal arisan), diuji approve → notif muncul di lonceng penerima.
- [x] Profil dropdown: nama+avatar di top bar, edit no. HP/avatar, tombol Keluar, penyimpanan no. WhatsApp diuji end-to-end.
- [x] PWA: manifest valid (name, short_name, icons 192/512/maskable, theme_color, background_color, display standalone, start_url /dashboard). **Catatan jujur:** tombol Install memakai `beforeinstallprompt`, dan event itu tidak pernah ditembak Chromium headless, jadi fungsinya belum bisa dibuktikan otomatis, perlu dicoba Iman di HP Android.
- [x] Checklist keamanan bagian 9 (lihat catatan per poin di laporan), diuji: RBAC server-side, preview read-only, laporan publik tidak bocor, IDOR, webhook token, akses /admin.
- [x] Tidak ada regresi: invite anggota, role checkbox multi-role, progress qurban tetap berfungsi setelah redesign.

## 11. Format Laporan Selesai (kirim ke Iman setelah semua checklist bagian 10 tercentang)

Laporkan dalam format berikut:

1. **Ringkasan perubahan**, daftar halaman/fitur yang diubah/ditambah (1-2 kalimat per item).
2. **Demo/screenshot** untuk tiap fitur utama (Platform Owner area, Preview as Role/User, Ringkasan baru, Arisan status bayar, Silsilah search+highlight, Laporan multi-tab, halaman laporan publik, notifikasi bell, profil dropdown, tombol install PWA), screenshot di viewport mobile.
3. **Hasil test RBAC**, tabel role x aksi yang sudah dites manual (atau otomatis), termasuk hasil test direct API call dengan role rendah ke endpoint keuangan (harus 403).
4. **Keputusan Tambahan**, daftar keputusan yang kamu ambil sendiri karena dokumen ini ambigu di suatu titik, beserta alasannya.
5. **Known issues / yang belum sempat dikerjakan** (kalau ada), jangan disembunyikan, sebutkan eksplisit supaya tidak ada gap saat Iman re-inspect.
6. **Perubahan skema database**, migration apa saja yang dijalankan.
7. Link ke commit/PR terkait untuk tiap fase.
