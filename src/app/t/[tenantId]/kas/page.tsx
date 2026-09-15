import { Wallet, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import Link from "next/link";
import { angkaTenant } from "@/lib/ringkasan";
import { ambilDari } from "@/lib/paging";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, inputClass, rupiah } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { createKasTransaksiAction } from "./actions";
import { KasRow } from "./kas-row";

export default async function KasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ dari?: string; sampai?: string; ambil?: string }>;
}) {
  const { tenantId } = await params;
  const { dari, sampai, ambil: ambilParam } = await searchParams;
  const ambil = ambilDari(ambilParam, 200, 2000);
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);

  const where = {
    tenantId,
    ...(dari || sampai
      ? { tanggal: { ...(dari ? { gte: new Date(dari) } : {}), ...(sampai ? { lte: new Date(sampai) } : {}) } }
      : {}),
  };
  const [transaksi, r] = await Promise.all([
    prisma.kasTransaksi.findMany({
      where,
      select: { id: true, tanggal: true, jumlah: true, tipe: true, keterangan: true, buktiUrl: true, dicatatOleh: { select: { name: true } } },
      orderBy: { tanggal: "desc" },
      take: ambil,
    }),
    angkaTenant(tenantId),
  ]);

  const canCatat = has(roles, CAN_CATAT_UANG);

  return (
    <div className="space-y-5">
      <PageTitle title="Kas" desc="Riwayat kas masuk & keluar tenant — transparan untuk semua anggota" />

      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <Wallet className="h-4 w-4 text-primary" /> Saldo Kas
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{rupiah.format(r.saldoKas)}</p>
        <p className="mt-1 text-xs text-muted">
          Masuk {rupiah.format(r.kasMasuk)} · Keluar {rupiah.format(r.kasKeluar)}
        </p>
      </Card>

      {canCatat && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Catat Transaksi</h2>
          <form action={createKasTransaksiAction} className="space-y-2" encType="multipart/form-data">
            <input type="hidden" name="tenantId" value={tenantId} />
            <div className="flex gap-2">
              <input type="date" name="tanggal" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
              <select name="tipe" required className={inputClass}>
                <option value="masuk">Masuk</option>
                <option value="keluar">Keluar</option>
              </select>
            </div>
            <InputRupiah name="jumlah" placeholder="Jumlah (Rp)" className={inputClass} required />
            <input name="keterangan" placeholder="Keterangan" className={inputClass} />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Bukti transfer (opsional)</label>
              <input type="file" name="bukti" accept="image/*" className="w-full text-xs" />
            </div>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Catat Transaksi
            </button>
          </form>
        </Card>
      )}

      <section>
        <div className="mb-2 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <h2 className="text-sm font-semibold">Riwayat Transaksi</h2>
          <form className="flex items-center gap-1 text-xs">
            <input type="date" name="dari" defaultValue={dari} className={`${inputClass} px-2 py-1`} aria-label="Dari tanggal" />
            <input type="date" name="sampai" defaultValue={sampai} className={`${inputClass} px-2 py-1`} aria-label="Sampai tanggal" />
            <button className="rounded-lg border border-border px-2 py-1">Filter</button>
          </form>
        </div>

        {transaksi.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi"
            desc={canCatat ? "Catat transaksi kas pertama lewat form di atas." : "Bendahara belum mencatat transaksi kas."}
          />
        ) : (
          <ul className="space-y-2">
            {transaksi.map((t) => (
              <li key={t.id}>
                <KasRow tenantId={tenantId} t={t} canEdit={canCatat} />
              </li>
            ))}
          </ul>
        )}
        {transaksi.length === ambil && (
          <p className="mt-2 text-center">
            <Link
              href={`?${new URLSearchParams({ ...(dari ? { dari } : {}), ...(sampai ? { sampai } : {}), ambil: String(ambil + 200) })}`}
              className="text-xs text-primary underline"
            >
              Muat 200 lagi
            </Link>
          </p>
        )}
        {r.keluarDariKas > 0 && (
          <p className="mt-2 text-xs text-muted">
            <Badge tone="muted">Catatan</Badge> Saldo di atas sudah dikurangi pengeluaran Dana Kegiatan yang mengambil dari kas.
          </p>
        )}
      </section>
    </div>
  );
}
