import Link from "next/link";
import Image from "next/image";
import { Wallet, HandCoins, TreePine, FileText } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { TRAKTEER_MODAL_URL } from "@/lib/trakteer";
import { TrakteerModal } from "@/components/trakteer-modal";

const TAMPILAN = [
  { file: "kas-mobile.png", label: "Kas", icon: Wallet, alt: "Halaman Kas menampilkan saldo dan riwayat transaksi masuk/keluar tenant" },
  { file: "qurban-mobile.png", label: "Qurban Joinan", icon: HandCoins, alt: "Halaman Qurban Joinan menampilkan progres patungan qurban kambing dan sapi per anggota" },
  { file: "silsilah-mobile.png", label: "Silsilah", icon: TreePine, alt: "Halaman Silsilah Keluarga menampilkan pohon keluarga bertingkat" },
  { file: "laporan-mobile.png", label: "Laporan", icon: FileText, alt: "Halaman Laporan menampilkan rekap keuangan tenant per kategori" },
];

const FITUR_PERAN = [
  { peran: "Ketua", desc: "Persetujuan tenant, atur pengurus, buka qurban joinan & arisan." },
  { peran: "Bendahara", desc: "Catat kas masuk/keluar, kelola tabungan, catat setoran." },
  { peran: "Sekretaris", desc: "Kelola data anggota & silsilah keluarga, update profil tenant." },
  { peran: "Anggota", desc: "Lihat kas & tabungan transparan, ikut qurban joinan, lihat laporan." },
];

export default async function Home() {
  const user = await getSessionUser();

  return (
    <main>
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-primary">Guyub</span>
        {user ? (
          <Link href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
            Dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-2 text-sm font-medium text-foreground/70 transition hover:text-foreground hover:underline">
              Masuk
            </Link>
            <Link href="/register" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
              Daftar
            </Link>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-10 text-center">
        <h1 className="text-2xl font-semibold">Kas keluarga, RT, atau paguyuban: rapi tanpa jadi beban pengurus</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Selama ini catatan kas cuma ada di grup WhatsApp atau buku tulis satu orang. Begitu ganti pengurus, riwayatnya ikut hilang.
          Guyub menyimpan kas, tabungan, qurban joinan, dan silsilah keluarga di satu tempat yang bisa dilihat semua anggota, kapan saja.
        </p>
        <Link href="/register" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
          Daftarkan Tenant Anda
        </Link>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8">
        <h2 className="mb-3 text-center text-lg font-semibold">Mulai dalam 3 langkah</h2>
        <ol className="space-y-2 text-sm">
          <li>1. Ketua daftar tenant (keluarga/RT/paguyuban) dengan akun Google.</li>
          <li>2. Menunggu persetujuan singkat dari pengelola platform.</li>
          <li>3. Undang anggota lewat link WhatsApp, pengurus konfirmasi yang bergabung.</li>
        </ol>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8">
        <h2 className="mb-2 text-center text-lg font-semibold">Tampilan yang Anda Pakai Setiap Hari</h2>
        <p className="mb-6 text-center text-sm text-foreground/70">Kas, qurban joinan, silsilah, dan laporan, semua dalam satu genggaman.</p>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {TAMPILAN.map((t) => (
            <figure key={t.file} className="m-0">
              <div className="mx-auto w-full max-w-[180px] overflow-hidden rounded-[20px] border-4 border-foreground/90 bg-background shadow-xl">
                <div className="flex items-center justify-center bg-foreground/90 py-1">
                  <div className="h-1 w-10 rounded-full bg-background/40" />
                </div>
                <Image src={`/screenshots/${t.file}`} alt={t.alt} width={780} height={1688} className="h-auto w-full" />
              </div>
              <figcaption className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground/70">
                <t.icon className="h-4 w-4 text-primary" /> {t.label}
              </figcaption>
            </figure>
          ))}
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
        <h2 className="mb-2 text-center text-lg font-semibold text-foreground">Data tenant Anda aman</h2>
        <p>
          Data setiap keluarga, RT, atau paguyuban terisolasi penuh dari tenant lain, tidak ada yang bisa saling
          mengintip. Fitur dasar (kas, tabungan, qurban joinan, arisan, silsilah, laporan) gratis dipakai; fitur
          lanjutan seperti upload bukti transfer dan pembayaran otomatis menyusul untuk tenant yang membutuhkannya.
        </p>
      </section>

      {TRAKTEER_MODAL_URL && (
        <section id="dukung" className="mx-auto max-w-md px-4 md:max-w-2xl py-8 text-center text-sm">
          <p className="mb-2 text-foreground/70">Suka dengan Guyub? Dukung pengembangannya secara sukarela.</p>
          <TrakteerModal
            modalUrl={TRAKTEER_MODAL_URL}
            label="Traktir Kami"
            className="inline-flex items-center gap-2 rounded-md border border-primary/30 px-4 py-2 font-medium text-primary"
          />
        </section>
      )}

      <footer className="border-t border-primary/15 bg-primary/5">
        <div className="mx-auto max-w-md px-4 py-10 md:max-w-2xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <span className="text-lg font-bold text-primary">Guyub</span>
              <p className="mt-2 max-w-xs text-sm text-foreground/70">Kas, tabungan, qurban joinan, dan silsilah keluarga, RT, atau paguyuban dalam satu tempat.</p>
            </div>
            <nav aria-label="Produk">
              <p className="text-sm font-semibold">Produk</p>
              <ul className="mt-3 space-y-2">
                <li><Link href="/register" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Daftar</Link></li>
                <li><Link href="/login" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Masuk</Link></li>
                <li><Link href="/cari" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Cari Tenant</Link></li>
              </ul>
            </nav>
            <nav aria-label="Lainnya">
              <p className="text-sm font-semibold">Lainnya</p>
              <ul className="mt-3 space-y-2">
                {TRAKTEER_MODAL_URL && (
                  <li><a href="#dukung" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Dukung Pengembang</a></li>
                )}
              </ul>
            </nav>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-primary/15 pt-6 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-foreground/50">
              © {new Date().getFullYear()} Guyub. Hak cipta dilindungi.
              <br />
              Guyub merupakan kontribusi dari{" "}
              <a href="https://thedreamcompany.space" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                The Dream Company
              </a>
              .
            </p>
            <Link href="/login" className="text-xs text-foreground/50 hover:text-foreground hover:underline">
              Masuk
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
