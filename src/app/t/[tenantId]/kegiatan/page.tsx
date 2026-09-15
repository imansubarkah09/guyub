import Link from "next/link";
import { Receipt, HandHeart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import { daftarPool } from "@/lib/dana";
import { ambilDari } from "@/lib/paging";
import { Card, PageTitle, EmptyState, Badge, Progress, btnGhost, inputClass, rupiah, tanggal } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { catatDonasiAction } from "./actions";
import { KegiatanForm } from "./kegiatan-form";

const LABEL_SUMBER = { kas: "Kas", infaq: "Infaq & Shodaqoh", donasi: "Donasi terbuka", tabungan: "Tabungan", plerek: "Plerek" } as const;

export default async function KegiatanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ ambil?: string }>;
}) {
  const { tenantId } = await params;
  const { ambil: ambilParam } = await searchParams;
  const ambil = ambilDari(ambilParam, 100, 1000);
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);

  // Donasi per kegiatan dulu ditarik SEMUA baris padahal yang tampil cuma 5 teratas
  // dan totalnya. Sekarang: 5 baris untuk tampilan, total & jumlahnya dari SQL.
  const [riwayat, donasiRekap, pools] = await Promise.all([
    prisma.danaKegiatan.findMany({
      where: { tenantId },
      include: {
        dicatatOleh: { select: { name: true } },
        sumber: { include: { sumberTabunganTipe: { select: { nama: true } } } },
        donasi: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, namaDonatur: true, jumlah: true } },
        _count: { select: { donasi: true } },
      },
      orderBy: { tanggal: "desc" },
      take: ambil,
    }),
    prisma.danaKegiatanDonasi.groupBy({ by: ["kegiatanId"], where: { kegiatan: { tenantId } }, _sum: { jumlah: true } }),
    daftarPool(tenantId),
  ]);

  const totalDonasi = new Map(donasiRekap.map((d) => [d.kegiatanId, Number(d._sum.jumlah ?? 0)]));

  const canCatat = has(roles, CAN_CATAT_UANG);
  const totalKeluar = riwayat.reduce((a, k) => a + k.sumber.reduce((b, s) => b + Number(s.jumlah), 0), 0);

  return (
    <div className="space-y-5">
      <PageTitle title="Dana Kegiatan" desc="Satu kegiatan bisa ditopang beberapa sumber dana sekaligus" />

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Total Dana Kegiatan</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{rupiah.format(totalKeluar)}</p>
        <div className="mt-3 grid gap-1 border-t border-border pt-2 text-xs">
          {pools
            .filter((p) => p.value !== "donasi")
            .map((p) => (
              <div key={p.value} className="flex justify-between">
                <span className="text-muted">{p.label}</span>
                <span className="tabular-nums">{rupiah.format(p.saldo)}</span>
              </div>
            ))}
        </div>
      </Card>

      {canCatat && <KegiatanForm tenantId={tenantId} pools={pools} />}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Riwayat Kegiatan</h2>
        {riwayat.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada dana kegiatan"
            desc={canCatat ? "Catat kegiatan pertama lewat form di atas — sumber dananya boleh dari beberapa pool." : "Bendahara belum mencatat kegiatan."}
          />
        ) : (
          <div className="space-y-3">
            {riwayat.map((k) => {
              const dariPool = k.sumber.filter((s) => s.sumberDana !== "donasi").reduce((a, s) => a + Number(s.jumlah), 0);
              const targetDonasi = k.sumber.filter((s) => s.sumberDana === "donasi").reduce((a, s) => a + Number(s.jumlah), 0);
              const dariDonasi = totalDonasi.get(k.id) ?? 0;
              const target = Number(k.targetDana ?? 0);
              const terkumpul = dariPool + dariDonasi;

              return (
                <Card key={k.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{k.namaKegiatan}</p>
                      <p className="text-xs text-muted">
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
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium tabular-nums">{rupiah.format(terkumpul)}</span>
                  </div>

                  {target > 0 && (
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs text-muted">
                        <span>Target {rupiah.format(target)}</span>
                        <span>{Math.round((terkumpul / target) * 100)}%</span>
                      </div>
                      <Progress value={(terkumpul / target) * 100} />
                    </div>
                  )}

                  <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                    {k.sumber.map((s) => (
                      <li key={s.id} className="flex justify-between">
                        <Badge tone={s.sumberDana === "donasi" ? "primary" : "muted"}>
                          {s.sumberDana === "tabungan" ? `Tabungan ${s.sumberTabunganTipe?.nama ?? ""}` : LABEL_SUMBER[s.sumberDana]}
                        </Badge>
                        <span className="tabular-nums">{rupiah.format(Number(s.jumlah))}</span>
                      </li>
                    ))}
                  </ul>

                  {targetDonasi > 0 && (
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                        <HandHeart className="h-3.5 w-3.5 text-accent" />
                        Donasi terkumpul {rupiah.format(dariDonasi)} dari target {rupiah.format(targetDonasi)}
                      </p>
                      {k._count.donasi > 0 && (
                        <ul className="mb-2 space-y-0.5 text-xs text-muted">
                          {k.donasi.map((d) => (
                            <li key={d.id} className="flex justify-between">
                              <span className="truncate">{d.namaDonatur}</span>
                              <span className="tabular-nums">{rupiah.format(Number(d.jumlah))}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {canCatat && (
                        <form action={catatDonasiAction} className="flex flex-col gap-2 min-[420px]:flex-row">
                          <input type="hidden" name="tenantId" value={tenantId} />
                          <input type="hidden" name="kegiatanId" value={k.id} />
                          <input name="namaDonatur" required placeholder="Nama donatur" className={`${inputClass} text-xs`} />
                          <InputRupiah name="jumlah" placeholder="Jumlah (Rp)" className={`${inputClass} text-xs`} required />
                          <button className={`${btnGhost} text-xs`}>Catat Donasi</button>
                        </form>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
        {riwayat.length === ambil && (
          <p className="mt-2 text-center">
            <Link href={`?ambil=${ambil + 100}`} className="text-xs text-primary underline">
              Muat 100 lagi
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
