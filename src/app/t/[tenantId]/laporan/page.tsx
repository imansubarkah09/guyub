import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_BUAT_LAPORAN, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import { samarkanKeterangan } from "@/lib/kas-privasi";
import { angkaTenant, saldoBerjalanArisan } from "@/lib/ringkasan";
import { angkaPlerek, kilogram } from "@/lib/plerek";
import { Card, PageTitle, inputClass, rupiah, tanggal } from "@/components/ui";
import { LaporanTabs, type TabData } from "./laporan-client";

export default async function LaporanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ dari?: string; sampai?: string }>;
}) {
  const { tenantId } = await params;
  const { dari, sampai } = await searchParams;
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);

  const rentang = (kolom: "tanggal" | "tanggalPertemuan") =>
    dari || sampai ? { [kolom]: { ...(dari ? { gte: new Date(dari) } : {}), ...(sampai ? { lte: new Date(sampai) } : {}) } } : {};

  const [tenant, r, kas, tabunganTipe, qurbanGroups, arisanList, infaq, laporanList, anggota, plerek, plerekPutaran] = await Promise.all([
    prisma.tenantProfile.findUniqueOrThrow({ where: { tenantId } }),
    angkaTenant(tenantId),
    // Laporan butuh semua baris di rentang yang diminta untuk isi tabel/PDF-nya.
    // Tanpa filter tanggal, dibatasi 2000 baris per kategori sebagai jaga-jaga
    // memori Worker untuk tenant tua — pakai filter tanggal di atas kalau mentok.
    prisma.kasTransaksi.findMany({ where: { tenantId, ...rentang("tanggal") }, select: { tanggal: true, tipe: true, jumlah: true, keterangan: true, keteranganRahasia: true }, orderBy: { tanggal: "desc" }, take: 2000 }),
    prisma.tabunganTipe.findMany({ where: { tenantId }, select: { nama: true, mode: true, saldo: { select: { userId: true, jumlah: true } } } }),
    prisma.qurbanGroup.findMany({ where: { tenantId }, select: { jenisHewan: true, slots: { select: { status: true, saldoTerkumpul: true, user: { select: { name: true } } } } } }),
    prisma.arisan.findMany({
      where: { tenantId },
      select: {
        periode: true,
        putaranBerjalan: true,
        jumlahSetoran: true,
        peserta: { select: { userId: true, urutan: true, user: { select: { name: true } } }, orderBy: { urutan: "asc" } },
        pembayaran: { select: { userId: true, putaran: true } },
      },
    }),
    prisma.infaqShodaqoh.findMany({
      where: { tenantId, ...rentang("tanggalPertemuan") },
      select: { tanggalPertemuan: true, jumlah: true, keterangan: true },
      orderBy: { tanggalPertemuan: "desc" },
      take: 2000,
    }),
    prisma.laporan.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.membership.findMany({ where: { tenantId, status: "active" }, select: { userId: true, user: { select: { name: true } } } }),
    angkaPlerek(tenantId),
    prisma.plerekPutaran.findMany({
      where: { tenantId, ...rentang("tanggal") },
      select: { tanggal: true, petugas: true, jumlahUang: true, berasKg: true },
      orderBy: { tanggal: "desc" },
      take: 2000,
    }),
  ]);

  const canGenerate = has(roles, CAN_BUAT_LAPORAN);
  const base = process.env.NEXT_PUBLIC_URL ?? "";

  const tabs: TabData[] = [
    {
      id: "kas",
      label: "Saldo Kas",
      ringkas: [
        { label: "Saldo", value: r.saldoKas },
        { label: "Total Masuk", value: r.kasMasuk },
      ],
      header: ["Tanggal", "Tipe", "Jumlah", "Keterangan"],
      rows: kas.map((k) => samarkanKeterangan(k, roles)).map((k) => ({
        kolom: [tanggal.format(k.tanggal), k.tipe, rupiah.format(Number(k.jumlah)), k.keterangan ?? "-"],
      })),
    },
    {
      id: "tabungan",
      label: "Tabungan",
      ringkas: [{ label: "Total Semua Tabungan", value: tabunganTipe.reduce((a, t) => a + t.saldo.reduce((b, s) => b + Number(s.jumlah), 0), 0) }],
      header: ["Jenis", "Mode", "Anggota", "Saldo"],
      rows: tabunganTipe.flatMap((t) =>
        t.mode === "pooled"
          ? [{ kolom: [t.nama, "bersama", "-", rupiah.format(t.saldo.reduce((a, s) => a + Number(s.jumlah), 0))] }]
          : anggota.map((m) => ({
              kolom: [t.nama, "individual", m.user.name, rupiah.format(Number(t.saldo.find((s) => s.userId === m.userId)?.jumlah ?? 0))],
            })),
      ),
    },
    {
      id: "qurban",
      label: "Qurban",
      ringkas: [{ label: "Total Terkumpul", value: r.qurbanTotal }],
      header: ["Hewan", "Peserta", "Terkumpul", "Status"],
      rows: qurbanGroups.flatMap((g) =>
        g.slots.map((s) => ({
          kolom: [g.jenisHewan, s.user.name, rupiah.format(Number(s.saldoTerkumpul)), s.status],
        })),
      ),
    },
    {
      id: "arisan",
      label: "Arisan",
      ringkas: [{ label: "Terkumpul Putaran Berjalan", value: arisanList.reduce((a, x) => a + saldoBerjalanArisan(x), 0) }],
      header: ["Arisan", "Peserta", "Urutan", "Status Bayar"],
      rows: arisanList.flatMap((a) =>
        a.peserta.map((p) => ({
          kolom: [
            a.periode,
            p.user.name,
            String(p.urutan),
            a.pembayaran.some((b) => b.userId === p.userId && b.putaran === a.putaranBerjalan) ? "Sudah Bayar" : "Belum Bayar",
          ],
        })),
      ),
    },
    {
      id: "plerek",
      label: "Plerek",
      // Stok beras satuannya kilogram, jadi tidak boleh masuk `ringkas` yang
      // selalu diformat sebagai Rupiah — ditaruh di kolom tabel.
      ringkas: [{ label: "Saldo Uang Plerek", value: plerek.saldoUang }],
      header: ["Tanggal", "Petugas", "Uang", "Beras (kg)"],
      rows: plerekPutaran.map((p) => ({
        kolom: [tanggal.format(p.tanggal), p.petugas ?? "-", rupiah.format(Number(p.jumlahUang)), kilogram.format(Number(p.berasKg))],
      })),
    },
    {
      id: "infaq",
      label: "Infaq & Shodaqoh",
      ringkas: [{ label: "Saldo", value: r.saldoInfaq }],
      header: ["Tanggal Pertemuan", "Jumlah", "Keterangan"],
      rows: infaq.map((i) => ({ kolom: [tanggal.format(i.tanggalPertemuan), rupiah.format(Number(i.jumlah)), i.keterangan ?? "-"] })),
    },
  ];

  return (
    <div className="space-y-5">
      <PageTitle title="Laporan" desc="Rekap keuangan tenant per kategori" />

      <form className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted">Rentang tanggal (kas, infaq, plerek):</span>
        <input type="date" name="dari" defaultValue={dari} className={`${inputClass} px-2 py-1`} aria-label="Dari tanggal" />
        <input type="date" name="sampai" defaultValue={sampai} className={`${inputClass} px-2 py-1`} aria-label="Sampai tanggal" />
        <button className="rounded-lg border border-border px-2 py-1">Filter</button>
        {(dari || sampai) && (
          <Link href={`/t/${tenantId}/laporan`} className="text-primary underline">
            Reset
          </Link>
        )}
      </form>

      <LaporanTabs tenantId={tenantId} tenantNama={tenant.nama} tabs={tabs} canGenerate={canGenerate} baseUrl={base} />

      {laporanList.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Laporan Terbit</h2>
          <ul className="space-y-2">
            {laporanList.map((l) => (
              <li key={l.id}>
                <Card className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-medium">{l.periode}</p>
                    <p className="text-xs text-muted">{tanggal.format(l.createdAt)}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {l.pdfUrl && (
                      <a href={l.pdfUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                        PDF
                      </a>
                    )}
                    <Link href={`${base}/laporan/${l.shareLink}`} className="text-primary underline">
                      Link publik
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
