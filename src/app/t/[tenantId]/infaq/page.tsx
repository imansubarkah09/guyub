import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import { angkaTenant } from "@/lib/ringkasan";
import { ambilDari } from "@/lib/paging";
import { Card, PageTitle, EmptyState, btnPrimary, btnGhost, inputClass, rupiah, tanggal } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { catatInfaqAction, hapusInfaqAction } from "./actions";

export default async function InfaqPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ ambil?: string }>;
}) {
  const { tenantId } = await params;
  const { ambil: ambilParam } = await searchParams;
  const ambil = ambilDari(ambilParam, 200, 2000);
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);

  const [riwayat, r] = await Promise.all([
    // Saldo di kartu atas dihitung penuh di SQL lewat angkaTenant(), jadi `ambil`
    // di bawah cuma membatasi daftar riwayatnya, bukan angkanya.
    prisma.infaqShodaqoh.findMany({
      where: { tenantId },
      select: { id: true, tanggalPertemuan: true, jumlah: true, keterangan: true, dicatatOleh: { select: { name: true } } },
      orderBy: { tanggalPertemuan: "desc" },
      take: ambil,
    }),
    angkaTenant(tenantId),
  ]);

  const canCatat = has(roles, CAN_CATAT_UANG);

  return (
    <div className="space-y-5">
      <PageTitle title="Infaq & Shodaqoh" desc="Dikumpulkan seikhlasnya tiap pertemuan rutin" />

      <Card className="bg-gradient-to-br from-accent/10 to-transparent">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <HeartHandshake className="h-4 w-4 text-accent" /> Saldo Infaq & Shodaqoh
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{rupiah.format(r.saldoInfaq)}</p>
        <p className="mt-1 text-xs text-muted">
          Terkumpul {rupiah.format(r.infaqMasuk)} · terpakai untuk kegiatan {rupiah.format(r.infaqKeluar)}
        </p>
      </Card>

      {canCatat && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Catat Infaq Pertemuan</h2>
          <form action={catatInfaqAction} className="space-y-2">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="date" name="tanggalPertemuan" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
            <InputRupiah name="jumlah" placeholder="Jumlah terkumpul (Rp)" className={inputClass} required />
            <input name="keterangan" placeholder="Keterangan (opsional)" className={inputClass} />
            <button type="submit" className={`${btnPrimary} w-full`}>
              Catat
            </button>
          </form>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Riwayat per Pertemuan</h2>
        {riwayat.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title="Belum ada catatan infaq"
            desc={canCatat ? "Catat infaq pertemuan pertama lewat form di atas." : "Bendahara belum mencatat infaq & shodaqoh."}
          />
        ) : (
          <ul className="space-y-2">
            {riwayat.map((i) => (
              <li key={i.id}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tanggal.format(i.tanggalPertemuan)}</p>
                    <p className="truncate text-xs text-muted">
                      {i.keterangan ?? "Pertemuan rutin"} · dicatat {i.dicatatOleh.name}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums text-accent">{rupiah.format(Number(i.jumlah))}</span>
                    {canCatat && (
                      <form action={hapusInfaqAction}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="id" value={i.id} />
                        <button className={`${btnGhost} px-2 py-1 text-xs`}>Hapus</button>
                      </form>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {riwayat.length === ambil && (
          <p className="mt-2 text-center">
            <Link href={`?ambil=${ambil + 200}`} className="text-xs text-primary underline">
              Muat 200 lagi
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
