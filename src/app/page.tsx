import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Wallet, HandCoins, TreePine, FileText, ShieldCheck, Lock, X, Check, Users, PiggyBank, Dices, UserPlus, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroWithStickyCta } from "@/components/sticky-cta";
import { TIMEZONE_WIB } from "@/lib/waktu";

export const metadata: Metadata = {
  title: { absolute: "KOMUNITA: Platform Manajemen Komunitas" },
  alternates: { canonical: "/" },
};

const TANGGAL_LENGKAP = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: TIMEZONE_WIB });

const TAMPILAN = [
  { file: "kas-mobile.png", label: "Kas", icon: Wallet, alt: "Halaman Kas menampilkan saldo dan riwayat transaksi masuk/keluar tenant" },
  { file: "qurban-mobile.png", label: "Qurban Joinan", icon: HandCoins, alt: "Halaman Qurban Joinan menampilkan progres patungan qurban kambing dan sapi per anggota" },
  { file: "silsilah-mobile.png", label: "Silsilah", icon: TreePine, alt: "Halaman Silsilah Keluarga menampilkan pohon keluarga bertingkat" },
  { file: "laporan-mobile.png", label: "Laporan", icon: FileText, alt: "Halaman Laporan menampilkan rekap keuangan tenant per kategori" },
];

/**
 * Satu screenshot dijadikan jangkar lebih besar dan lurus, tiga lainnya
 * lebih kecil dan dimiringkan tipis di bawahnya. Motif frame HP yang sama
 * (border tebal, bezel, shadow) cuma diberi hierarki, bukan diseragamkan
 * jadi grid rata seperti sebelumnya (§bolder, 15 Sep 2026).
 */
function Mockup({ t, rotate, besar }: { t: (typeof TAMPILAN)[number]; rotate: string; besar?: boolean }) {
  return (
    <figure className={`m-0 flex-shrink-0 ${rotate} ${besar ? "w-[220px] sm:w-[260px]" : "w-[140px] sm:w-[160px]"}`}>
      <div className={`mx-auto w-full overflow-hidden rounded-[20px] border-4 border-foreground/90 bg-background ${besar ? "shadow-2xl" : "shadow-lg"}`}>
        <div className="flex items-center justify-center bg-foreground/90 py-1">
          <div className="h-1 w-10 rounded-full bg-background/40" />
        </div>
        <Image src={`/screenshots/${t.file}`} alt={t.alt} width={780} height={1688} className="h-auto w-full" />
      </div>
      <figcaption className={`mt-2 flex items-center justify-center gap-1.5 font-medium text-foreground/70 ${besar ? "text-sm" : "text-xs"}`}>
        <t.icon className={`${besar ? "h-5 w-5" : "h-4 w-4"} text-primary`} /> {t.label}
      </figcaption>
    </figure>
  );
}

const MASALAH = [
  "Riwayat kas tenggelam di antara ratusan chat grup WhatsApp keluarga, RT, atau paguyuban",
  "Catatan keuangan cuma ada di buku tulis atau HP satu bendahara, hilang begitu pengurus ganti",
  'Anggota bertanya-tanya: "uang kas dipakai buat apa, ya?"',
  "Data anggota, tabungan, dan arisan tersebar di banyak tempat dan sulit dicocokkan",
];

const SOLUSI = [
  "Satu tautan untuk semua anggota, bisa dicek kapan saja tanpa scroll chat",
  "Kas, tabungan, arisan, dan qurban tercatat rapi dan tetap utuh walau pengurus berganti",
  "Laporan keuangan bisa diterbitkan dan dibagikan lewat tautan atau PDF",
  "Setiap komunitas punya ruang data sendiri yang terpisah dari komunitas lain",
];

const FITUR = [
  { icon: Users, judul: "Anggota & undangan", ket: "Undang lewat WhatsApp, pengurus mengonfirmasi siapa yang bergabung, peran diatur per komunitas." },
  { icon: Wallet, judul: "Kas komunitas", ket: "Catat pemasukan dan pengeluaran lengkap dengan bukti, saldo selalu terlihat." },
  { icon: PiggyBank, judul: "Tabungan anggota", ket: "Setoran dan saldo per anggota tercatat terpisah dari kas umum." },
  { icon: Dices, judul: "Arisan", ket: "Peserta, jadwal, pembayaran, dan undian dalam satu tempat." },
  { icon: HandCoins, judul: "Qurban bersama", ket: "Patungan kambing atau sapi, progres per anggota terlihat jelas." },
  { icon: TreePine, judul: "Silsilah keluarga", ket: "Susun pohon keluarga bertingkat untuk keluarga besar dan paguyuban." },
  { icon: FileText, judul: "Laporan keuangan", ket: "Rekap per kategori, terbitkan sebagai PDF dan bagikan lewat tautan." },
  { icon: ClipboardList, judul: "Peran & izin", ket: "Ketua, bendahara, sekretaris, dan anggota punya akses yang sesuai tugasnya." },
];

const CARA_KERJA = [
  "Ketua mendaftarkan komunitas memakai akun Google, tanpa kata sandi baru.",
  "Tunggu persetujuan singkat dari pengelola platform.",
  "Undang anggota lewat tautan WhatsApp, pengurus mengonfirmasi yang bergabung.",
  "Catat kas, tabungan, arisan, dan kegiatan. Terbitkan laporan kapan saja.",
];

const USE_CASES = [
  { judul: "Keluarga besar", ket: "Arisan keluarga, silsilah, dan iuran acara bersama." },
  { judul: "RT/RW", ket: "Kas lingkungan, iuran warga, dan laporan untuk warga." },
  { judul: "Paguyuban & organisasi", ket: "Data anggota, kas, tabungan, dan kegiatan dalam satu tempat." },
  { judul: "Qurban & kegiatan bersama", ket: "Patungan, dana kegiatan, dan donasi tercatat transparan." },
];

const KEUNGGULAN = [
  { icon: ShieldCheck, judul: "Data terpisah per komunitas", ket: "Data satu komunitas tidak terlihat oleh komunitas lain." },
  { icon: Lock, judul: "Masuk dengan akun Google", ket: "Tanpa kata sandi baru untuk diingat atau bocor." },
  { icon: Check, judul: "Transparan", ket: "Anggota dapat memantau kas dan laporan kapan saja." },
  { icon: UserPlus, judul: "Mudah dipakai di HP", ket: "Dibuat mobile-first dan bisa dipasang seperti aplikasi (PWA)." },
];

const FAQ = [
  { q: "Apakah perlu memasang aplikasi?", a: "Tidak wajib. KOMUNITA berjalan di browser, dan bisa dipasang ke layar utama HP sebagai aplikasi (PWA)." },
  { q: "Bagaimana cara masuk?", a: "Dengan akun Google. Tidak ada kata sandi baru yang perlu dibuat." },
  { q: "Apakah data komunitas saya terlihat komunitas lain?", a: "Tidak. Setiap komunitas punya ruang data terpisah, dan hanya anggota yang disetujui pengurus yang dapat mengaksesnya." },
  { q: "Satu akun bisa di banyak komunitas?", a: "Bisa. Satu akun dapat bergabung di beberapa komunitas dengan peran berbeda di tiap komunitas." },
  { q: "Apakah ada biaya?", a: "Fitur dasar dapat dipakai tanpa biaya. Fitur tambahan yang menyusul bisa berbayar, dan ceritanya ada di halaman Tentang." },
];

export default async function Home() {
  const [user, tenantAktif, anggotaAktif] = await Promise.all([
    getSessionUser(),
    prisma.tenant.count({ where: { status: "approved" } }),
    prisma.membership.count({ where: { status: "active" } }),
  ]);
  const wrap = "mx-auto max-w-md px-4 md:max-w-2xl py-8";

  return (
    <main>
      <SiteHeader loggedIn={!!user} />

      <HeroWithStickyCta>
        <section className="mx-auto max-w-md px-4 md:max-w-2xl py-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">KOMUNITA</h1>
          <p className="mt-2 text-xl font-semibold">Semua Komunitas, Satu Platform.</p>
          <p className="mt-3 text-sm text-foreground/70">
            Kelola anggota, kas, tabungan, arisan, dan kegiatan komunitas dalam satu platform digital yang praktis, transparan, dan mudah digunakan.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
              Mulai Kelola Komunitas
            </Link>
            <a href="#fitur" className="inline-block rounded-md border border-primary/30 px-6 py-3 text-sm font-medium text-primary transition hover:bg-primary/5">
              Jelajahi Fitur
            </a>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-foreground/70">
            <Lock className="h-3.5 w-3.5 text-success" /> Data komunitas Anda terkunci privat, fitur dasarnya dapat dipakai tanpa biaya.
          </p>
        </section>
      </HeroWithStickyCta>

      {tenantAktif > 0 && (
        <section className="mx-auto max-w-md px-4 md:max-w-2xl py-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Users className="h-4 w-4 text-primary" /> Sudah Dipakai Bersama
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            Dipakai pengurus di {tenantAktif} komunitas, {anggotaAktif} anggota aktif.
          </p>
          <p className="mt-1 text-xs text-muted">Terakhir diperbarui: {TANGGAL_LENGKAP.format(new Date())}</p>
        </section>
      )}

      <section className={wrap}>
        <h2 className="mb-2 text-center text-lg font-semibold">Masalah yang Sering Dihadapi Komunitas</h2>
        <ul className="mt-4 space-y-2 rounded-md border border-danger/20 bg-danger/5 p-4 text-sm text-foreground/70">
          {MASALAH.map((t) => (
            <li key={t} className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" /> {t}</li>
          ))}
        </ul>
      </section>

      <section className={wrap}>
        <h2 className="mb-2 text-center text-lg font-semibold">Solusi KOMUNITA</h2>
        <ul className="mt-4 space-y-2 rounded-md border border-success/20 bg-success/5 p-4 text-sm text-foreground/70">
          {SOLUSI.map((t) => (
            <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" /> {t}</li>
          ))}
        </ul>
      </section>

      <section id="fitur" className="mx-auto max-w-md scroll-mt-4 px-4 md:max-w-3xl py-8">
        <h2 className="mb-4 text-center text-lg font-semibold">Fitur Utama</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FITUR.map((f) => (
            <li key={f.judul} className="rounded-md border border-primary/15 bg-surface p-4">
              <p className="flex items-center gap-2 font-medium text-primary"><f.icon className="h-4 w-4" /> {f.judul}</p>
              <p className="mt-1 text-sm text-foreground/70">{f.ket}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={wrap}>
        <h2 className="mb-1 text-center text-lg font-semibold">Cara Kerja</h2>
        <p className="mb-4 text-center text-sm text-foreground/70">Tanpa instalasi dan tanpa pelatihan. Beres dalam hitungan menit.</p>
        <ol className="space-y-3 text-sm">
          {CARA_KERJA.map((teks, i) => (
            <li key={teks} className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
              <span className="pt-0.5">{teks}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={wrap}>
        <h2 className="mb-4 text-center text-lg font-semibold">Untuk Siapa KOMUNITA</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <li key={u.judul} className="rounded-md border border-primary/15 p-3">
              <p className="font-medium text-primary">{u.judul}</p>
              <p className="text-sm text-foreground/70">{u.ket}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={wrap}>
        <h2 className="mb-4 text-center text-lg font-semibold">Keunggulan</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {KEUNGGULAN.map((k) => (
            <li key={k.judul} className="flex items-start gap-3 text-sm">
              <k.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
              <span><span className="font-medium">{k.judul}.</span> <span className="text-foreground/70">{k.ket}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-lg px-4 md:max-w-4xl py-14">
        <h2 className="mb-2 text-center text-2xl font-semibold">Tampilan yang Anda Pakai Setiap Hari</h2>
        <p className="mb-10 text-center text-sm text-foreground/70">Kas, qurban, silsilah, sampai laporan, semua ada di genggaman Anda.</p>
        <div className="flex flex-col items-center gap-8">
          <Mockup t={TAMPILAN[0]} rotate="-rotate-1" besar />
          <div className="flex flex-wrap items-end justify-center gap-6">
            {TAMPILAN.slice(1).map((t, i) => (
              <Mockup key={t.file} t={t} rotate={["rotate-2", "-rotate-2", "rotate-1"][i]} />
            ))}
          </div>
        </div>
      </section>

      <section className={wrap}>
        <h2 className="mb-4 text-center text-lg font-semibold">Pertanyaan Umum</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-md border border-primary/15 bg-surface p-3 text-sm">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-foreground/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-10 text-center">
        <h2 className="text-xl font-semibold">Siap merapikan komunitas Anda?</h2>
        <Link href="/register" className="mt-4 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
          Mulai Kelola Komunitas
        </Link>
        <p className="mt-4 text-sm text-foreground/70">
          Biaya operasional ditanggung pengembangnya.{" "}
          <Link href="/tentang" className="font-medium text-primary hover:underline">Baca ceritanya & ikut dukung →</Link>
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
