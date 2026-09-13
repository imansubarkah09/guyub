import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, btnPrimary, rupiah, tanggal } from "@/components/ui";

export default async function LaporanPublikPage({ params }: { params: Promise<{ shareLink: string }> }) {
  const { shareLink } = await params;

  // Sengaja select eksplisit: halaman ini publik, jadi yang boleh keluar hanya angka
  // agregat + nama tenant. Tidak ada nama anggota, tidak ada transaksi individu (§7.11/§9).
  const laporan = await prisma.laporan.findUnique({
    where: { shareLink },
    select: {
      periode: true,
      totalMasuk: true,
      totalKeluar: true,
      createdAt: true,
      tenant: { select: { profile: { select: { nama: true } } } },
    },
  });
  if (!laporan) notFound();

  const masuk = Number(laporan.totalMasuk);
  const keluar = Number(laporan.totalKeluar);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-sm text-muted">Laporan Keuangan</p>
        <h1 className="text-xl font-semibold">{laporan.tenant.profile?.nama ?? "Tenant Guyub"}</h1>
        <p className="mt-1 text-sm text-muted">
          Periode {laporan.periode} · terbit {tanggal.format(laporan.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ArrowDownLeft className="h-4 w-4 text-success" /> Uang Masuk
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-success">{rupiah.format(masuk)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ArrowUpRight className="h-4 w-4 text-danger" /> Uang Keluar
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-danger">{rupiah.format(keluar)}</p>
        </Card>
      </div>

      <Card className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
          <Lock className="h-4 w-4" />
          Untuk melihat detail lengkap, daftar/masuk sebagai anggota.
        </p>
        <Link href="/login" className={`${btnPrimary} mt-3`}>
          Masuk / Daftar
        </Link>
      </Card>

      <p className="text-center text-xs text-muted">Dikelola dengan Guyub</p>
    </main>
  );
}
