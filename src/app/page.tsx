import Link from "next/link";
import Image from "next/image";
import { Wallet, HandCoins, TreePine, FileText, ShieldCheck, X, Check, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Wajib eksplisit: SiteHeader (di dalam JSX yang direturn, bukan di-await duluan
 * di sini) yang memanggil headers(), bukan Home() sendiri. Tanpa ini, saat build
 * mencoba prerender statis, prisma.tenant.count()/membership.count() di bawah
 * jalan duluan sebelum Next sempat lihat sinyal dynamic dari SiteHeader, dan
 * build gagal kalau DB tidak bisa dihubungi (persis begini di CI, DATABASE_URL
 * cuma placeholder localhost yang tidak ada Postgres-nya).
 */
export const dynamic = "force-dynamic";

const TANGGAL_LENGKAP = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

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

/**
 * Format "Sebelum/Sesudah" ditiru dari landing page schoolcommunity.space (referensi UI
 * per CLAUDE.md), tapi isinya diadaptasi ke keresahan keluarga/RT/paguyuban, bukan kelas.
 */
const SEBELUM = [
  "Riwayat kas tenggelam di antara ratusan chat grup WhatsApp keluarga, RT, atau paguyuban",
  "Catatan keuangan cuma nangkring di buku tulis atau HP satu bendahara, raib begitu pengurus ganti",
  'Anggota diam-diam curiga: "uang kas kepakai buat apa, ya?"',
];

const SESUDAH = [
  "Tinggal buka satu link, semua anggota bisa cek kapan saja tanpa scroll-scroll chat",
  "Kas, tabungan, dan qurban joinan tercatat rapi, aman walau pengurusnya gonta-ganti",
  "Transparan sejak awal, nggak ada lagi ruang buat curiga-curigaan",
];

const FITUR_PERAN = [
  { peran: "Ketua", desc: "Setujui pendaftaran, atur siapa jadi pengurus, buka qurban joinan & arisan." },
  { peran: "Bendahara", desc: "Catat kas masuk-keluar, kelola tabungan, catat setoran, gampang kok." },
  { peran: "Sekretaris", desc: "Urus data anggota & silsilah keluarga, update profil tenant." },
  { peran: "Anggota", desc: "Pantau kas & tabungan kapan saja, ikut qurban joinan, cek laporan." },
];

export default async function Home() {
  const [tenantAktif, anggotaAktif] = await Promise.all([
    prisma.tenant.count({ where: { status: "approved" } }),
    prisma.membership.count({ where: { status: "active" } }),
  ]);

  return (
    <main>
      <SiteHeader />

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-10 text-center">
        <h1 className="text-2xl font-semibold">Kas keluarga, RT, atau paguyuban, rapi tanpa bikin pengurus pusing</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Selama ini catatan kas cuma nongkrong di grup WhatsApp atau buku tulis satu orang. Begitu pengurus ganti, riwayatnya ikut raib.
          Di Guyub, kas, tabungan, qurban joinan, sampai silsilah keluarga Anda tersimpan rapi di satu tempat, tinggal dicek semua anggota kapan saja.
        </p>
        <Link href="/register" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
          Daftarkan Tenant Anda, Yuk
        </Link>
      </section>

      {tenantAktif > 0 && (
        <section className="mx-auto max-w-md px-4 md:max-w-2xl py-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Users className="h-4 w-4 text-primary" /> Sudah Dipakai Bersama
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            Sudah dipakai pengurus di {tenantAktif} keluarga, RT, atau paguyuban, {anggotaAktif} anggota aktif.
          </p>
          <p className="mt-1 text-xs text-muted">Terakhir diperbaharui: {TANGGAL_LENGKAP.format(new Date())}</p>
        </section>
      )}

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8">
        <h2 className="mb-2 text-center text-lg font-semibold">Kas Anda, Sebelum dan Sesudah</h2>
        <p className="mb-6 text-center text-sm text-foreground/70">Masalah ini sering banget dialami pengurus, mana pun tenant-nya.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-danger/20 bg-danger/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger">
              <X className="h-4 w-4" /> Sebelum
            </p>
            <ul className="space-y-2 text-sm text-foreground/70">
              {SEBELUM.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-success/20 bg-success/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-success">
              <Check className="h-4 w-4" /> Sesudah
            </p>
            <ul className="space-y-2 text-sm text-foreground/70">
              {SESUDAH.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8">
        <h2 className="mb-1 text-center text-lg font-semibold">Mulai dalam 3 langkah</h2>
        <p className="mb-4 text-center text-sm text-foreground/70">Nggak perlu instal apa-apa, nggak perlu training. Beres dalam hitungan menit.</p>
        {/* Nomor lingkaran tint primary: urutannya memang membawa informasi
            (langkah 2 baru bisa jalan setelah 1 selesai), jadi bukan hiasan,
            sebelumnya cuma teks "1. 2. 3." polos tanpa penanda visual apa pun
            (§colorize, 15 Sep 2026). */}
        <ol className="space-y-3 text-sm">
          {[
            "Ketua daftar tenant (keluarga, RT, atau paguyuban) pakai akun Google, tinggal klik.",
            "Tunggu ACC singkat dari pengelola platform.",
            "Undang anggota lewat link WhatsApp, pengurus tinggal konfirmasi siapa yang gabung.",
          ].map((teks, i) => (
            <li key={teks} className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
              <span className="pt-0.5">{teks}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-lg px-4 md:max-w-4xl py-14">
        <h2 className="mb-2 text-center text-2xl font-semibold">Tampilan yang Anda Pakai Setiap Hari</h2>
        <p className="mb-10 text-center text-sm text-foreground/70">Kas, qurban joinan, silsilah, sampai laporan, semua ada di genggaman Anda.</p>
        <div className="flex flex-col items-center gap-8">
          <Mockup t={TAMPILAN[0]} rotate="-rotate-1" besar />
          <div className="flex flex-wrap items-end justify-center gap-6">
            {TAMPILAN.slice(1).map((t, i) => (
              <Mockup key={t.file} t={t} rotate={["rotate-2", "-rotate-2", "rotate-1"][i]} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8">
        <h2 className="mb-3 text-center text-lg font-semibold">Fitur per peran</h2>
        <ul className="space-y-3 text-sm">
          {FITUR_PERAN.map((f) => (
            <li key={f.peran} className="rounded-md border border-primary/15 p-3">
              <p className="font-medium text-primary">{f.peran}</p>
              <p className="text-foreground/70">{f.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8 text-sm text-foreground/70">
        {/* ShieldCheck di text-success: peran warna yang sama dengan "aman/berhasil"
            di seluruh app (Badge & StatCard tone="success"), bukan warna baru
            (§colorize, 15 Sep 2026). */}
        <h2 className="mb-2 flex items-center justify-center gap-2 text-center text-lg font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-success" /> Data Tenant Anda Aman
        </h2>
        <p>
          Data keluarga, RT, atau paguyuban Anda terkunci rapat, nggak bakal kelihatan tenant lain, apalagi saling
          intip. Fitur dasarnya, kas, tabungan, qurban joinan, arisan, silsilah, laporan, bisa dipakai gratis.
          Fitur tambahan kayak upload bukti transfer dan pembayaran otomatis menyusul, buat tenant yang memang butuh.
        </p>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8 text-center text-sm">
        <p className="text-foreground/70">
          Guyub gratis, tapi bukan berarti tanpa biaya, semuanya ditanggung sendiri oleh pengembangnya.{" "}
          <Link href="/tentang" className="font-medium text-primary hover:underline">
            Baca ceritanya & ikut dukung →
          </Link>
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
