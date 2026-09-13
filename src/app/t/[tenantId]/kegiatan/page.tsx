import { Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import { daftarPool } from "@/lib/dana";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, inputClass, rupiah, tanggal } from "@/components/ui";
import { catatKegiatanAction } from "./actions";

export default async function KegiatanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const { roles, readOnly } = await effectiveRoles(user, tenantId);

  const [riwayat, pools] = await Promise.all([
    prisma.danaKegiatan.findMany({
      where: { tenantId },
      include: { dicatatOleh: true, sumberTabunganTipe: true },
      orderBy: { tanggal: "desc" },
    }),
    daftarPool(tenantId),
  ]);

  const canCatat = has(roles, CAN_CATAT_UANG) && !readOnly;
  const totalKeluar = riwayat.reduce((a, k) => a + Number(k.jumlah), 0);

  return (
    <div className="space-y-5">
      <PageTitle title="Dana Kegiatan" desc="Pengeluaran kegiatan tenant — otomatis mengurangi saldo sumber dana" />

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Total Pengeluaran Kegiatan</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{rupiah.format(totalKeluar)}</p>
        <div className="mt-3 grid gap-1 border-t border-border pt-2 text-xs">
          {pools.map((p) => (
            <div key={p.value} className="flex justify-between">
              <span className="text-muted">{p.label}</span>
              <span className="tabular-nums">{rupiah.format(p.saldo)}</span>
            </div>
          ))}
        </div>
      </Card>

      {canCatat && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Catat Pengeluaran</h2>
          <form action={catatKegiatanAction} className="space-y-2" encType="multipart/form-data">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input name="namaKegiatan" required placeholder="Nama kegiatan, misal: Jumat Berkah" className={inputClass} />
            <select name="sumberDana" required className={inputClass}>
              {pools.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} — tersedia {rupiah.format(p.saldo)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input type="number" name="jumlah" min="1" step="1" required placeholder="Jumlah (Rp)" className={inputClass} />
              <input type="date" name="tanggal" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
            </div>
            <input name="keterangan" placeholder="Keterangan (opsional)" className={inputClass} />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Bukti (opsional)</label>
              <input type="file" name="bukti" accept="image/*" className="w-full text-xs" />
            </div>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Catat Pengeluaran
            </button>
          </form>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Riwayat Kegiatan</h2>
        {riwayat.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada dana kegiatan"
            desc={canCatat ? "Catat pengeluaran kegiatan pertama lewat form di atas." : "Bendahara belum mencatat pengeluaran kegiatan."}
          />
        ) : (
          <ul className="space-y-2">
            {riwayat.map((k) => (
              <li key={k.id}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{k.namaKegiatan}</p>
                    <p className="truncate text-xs text-muted">
                      {tanggal.format(k.tanggal)} · {k.dicatatOleh.name}
                      {k.buktiUrl && (
                        <>
                          {" · "}
                          <a href={k.buktiUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            bukti
                          </a>
                        </>
                      )}
                    </p>
                    <div className="mt-1">
                      <Badge tone="muted">
                        dari {k.sumberDana === "kas" ? "Kas" : k.sumberDana === "infaq" ? "Infaq & Shodaqoh" : `Tabungan ${k.sumberTabunganTipe?.nama ?? ""}`}
                      </Badge>
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-sm font-medium tabular-nums text-danger">−{rupiah.format(Number(k.jumlah))}</span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
