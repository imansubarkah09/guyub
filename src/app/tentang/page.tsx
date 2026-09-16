import Link from "next/link";
import { Server, Database, Globe, Cloud, Users, Home } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, StatCard, Badge } from "@/components/ui";
import { TrakteerModal } from "@/components/trakteer-modal";
import { TRAKTEER_MODAL_URL } from "@/lib/trakteer";

/** Sama seperti src/app/page.tsx: SiteHeader manggil headers() di dalam JSX
 * yang direturn, bukan di-await duluan di sini, jadi wajib dipaksa dynamic
 * eksplisit supaya prisma.count() di bawah tidak dicoba jalan saat build
 * statis (gagal kalau DB tidak bisa dihubungi, lihat komentar di page.tsx). */
export const dynamic = "force-dynamic";

const BIAYA = [
  { icon: Server, judul: "Web server", ket: "Supaya Guyub bisa dibuka kapan saja dari HP siapa pun, tanpa nunggu loading lama." },
  { icon: Database, judul: "Database server", ket: "Tempat kas, tabungan, dan silsilah keluarga Anda tersimpan aman, bukan cuma di HP satu orang." },
  { icon: Globe, judul: "Nama domain", ket: "Biar alamatnya gampang diingat & dipercaya, bukan link acak-acakan yang gampang dicurigai." },
  { icon: Cloud, judul: "File server", ket: "Buat bukti transfer, logo tenant, dan foto lain yang diupload pengurus." },
];

export default async function TentangPage() {
  const [tenantAktif, anggotaAktif] = await Promise.all([
    prisma.tenant.count({ where: { status: "approved" } }),
    prisma.membership.count({ where: { status: "active" } }),
  ]);

  return (
    <main>
      <SiteHeader />

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-10 text-center">
        <h1 className="text-2xl font-semibold">Guyub gratis, biayanya saya yang tanggung sendiri</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Nama saya Iman, saya yang bikin Guyub. Fitur dasarnya, kas, tabungan, qurban joinan, arisan, silsilah,
          laporan, memang sengaja saya bikin gratis. Tapi server, database, dan domain yang menjalankannya tetap
          harus dibayar tiap bulan, dan itu keluar dari kantong saya pribadi, bukan investor atau iklan.
        </p>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-6">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Tenant Aktif" value={String(tenantAktif)} icon={Home} />
          <StatCard label="Anggota Aktif" value={String(anggotaAktif)} icon={Users} tone="success" />
        </div>
        <p className="mt-2 text-center text-xs text-muted">Angka nyata dari database Guyub saat ini, bukan target atau proyeksi.</p>
      </section>

      <section id="dukung" className="mx-auto max-w-md px-4 md:max-w-2xl py-8 text-center">
        <h2 className="mb-2 text-lg font-semibold">Traktir saya, kalau Anda mau</h2>
        <p className="mb-5 text-sm text-foreground/70">
          Tiap tenant di Guyub punya &ldquo;nyawa&rdquo;, masa aktif yang otomatis bertambah tiap kali ada yang traktir lewat
          tombol di bawah. Dukungan Anda tidak cuma buat saya, tapi menambah nyawa untuk seluruh anggota tenant itu,
          supaya catatan kas dan tabungan keluarga Anda tetap hidup lebih lama.
        </p>
        {TRAKTEER_MODAL_URL && (
          <TrakteerModal
            modalUrl={TRAKTEER_MODAL_URL}
            label="Traktir Kami"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          />
        )}
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8">
        <h2 className="mb-3 text-center text-lg font-semibold">Ke mana biayanya pergi</h2>
        <Card>
          <ul className="space-y-1">
            {BIAYA.map((b) => (
              <li key={b.judul} className="flex flex-col gap-2 rounded-lg p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <b.icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{b.judul}</p>
                    <p className="text-xs text-foreground/60">{b.ket}</p>
                  </div>
                </div>
                <Badge tone="muted" className="self-start sm:self-auto">Ditanggung developer, biaya pribadi</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <p className="mt-3 text-center text-xs text-muted">
          Nominalnya sengaja tidak saya sebut di sini, yang penting Anda tahu ini bukan biaya imajiner, makin banyak
          tenant yang pakai Guyub, makin besar juga tagihannya buat saya.
        </p>
      </section>

      <section className="mx-auto max-w-md px-4 md:max-w-2xl py-8 text-center text-sm">
        <p className="text-foreground/70">
          Guyub adalah salah satu karya{" "}
          <a href="https://product.thedreamcompany.space" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            The Dream Company
          </a>
          , studio yang saya jalankan sendiri untuk bikin aplikasi web custom. Kalau keluarga besar, RT, komunitas,
          atau bisnis Anda butuh sistem serupa yang dibikin khusus sesuai kebutuhan, cek karya-karya The Dream Company
          lainnya.
        </p>
        <a
          href="https://product.thedreamcompany.space"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-md border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
        >
          Kunjungi The Dream Company
        </a>
      </section>

      <p className="mx-auto max-w-md px-4 pb-8 text-center text-xs md:max-w-2xl">
        <Link href="/" className="text-foreground/70 hover:text-foreground hover:underline">
          ← Kembali ke Beranda
        </Link>
      </p>

      <SiteFooter />
    </main>
  );
}
