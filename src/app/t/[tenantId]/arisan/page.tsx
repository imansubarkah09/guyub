import Link from "next/link";
import { CircleDollarSign, CheckCircle2, Clock, Trophy, CalendarDays, Home, Dices } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_ATUR_ARISAN, CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { Card, PageTitle, StatCard, EmptyState, Badge, btnPrimary, btnGhost, inputClass, rupiah } from "@/components/ui";
import { SpinWheel } from "./spin-wheel";
import {
  createArisanAction,
  addPesertaAction,
  hapusPesertaAction,
  toggleSudahDapatAction,
  batalkanUndianAction,
  tolakTuanRumahAction,
  lanjutPutaranAction,
  toggleBayarAction,
} from "./actions";

export default async function ArisanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);
  const viewerId = await viewerUserId(user, tenantId);

  const [arisanList, anggota] = await Promise.all([
    prisma.arisan.findMany({
      where: { tenantId },
      include: {
        peserta: { include: { user: true }, orderBy: [{ urutan: "asc" }] },
        pembayaran: true,
        undian: { include: { peserta: { include: { user: true } } }, orderBy: { createdAt: "desc" } },
        kandidatTuanRumah: { include: { user: true } },
      },
      orderBy: { id: "desc" },
    }),
    prisma.membership.findMany({ where: { tenantId, status: "active" }, include: { user: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const canAtur = has(roles, CAN_ATUR_ARISAN);
  const canTandaiBayar = has(roles, CAN_CATAT_UANG);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Arisan"
        desc="Kocokan, status bayar, dan saldo putaran berjalan"
        action={
          <Link href={`/t/${tenantId}/arisan/jadwal`} className={btnGhost}>
            <CalendarDays className="h-4 w-4" /> Jadwal
          </Link>
        }
      />

      {canAtur && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Buat Arisan Baru</h2>
          <form action={createArisanAction} className="space-y-2">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input name="periode" required placeholder="Periode, misal: Bulanan 2026" className={inputClass} />
            <div className="flex gap-2">
              <input type="number" name="jumlahSetoran" min="0" step="1" required placeholder="Setoran per slot (Rp)" className={inputClass} />
              <input type="number" name="pemenangPerPutaran" min="1" max="10" defaultValue={1} title="Berapa nama keluar sekali kocok" className={inputClass} />
            </div>
            <div className="flex gap-2">
              <input type="number" name="potonganPersen" min="0" max="100" step="0.5" defaultValue={0} placeholder="Potongan %" className={inputClass} />
              <input name="potonganKeterangan" placeholder="Keterangan potongan, mis. konsumsi" className={inputClass} />
            </div>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Buat Arisan
            </button>
          </form>
        </Card>
      )}

      {arisanList.length === 0 ? (
        <EmptyState
          icon={CircleDollarSign}
          title="Belum ada arisan"
          desc={canAtur ? "Buat arisan, tambahkan slot pesertanya, lalu kocok lewat roda undian." : "Pengurus belum membuat arisan di tenant ini."}
        />
      ) : (
        arisanList.map((a) => {
          const bayarPutaran = a.pembayaran.filter((p) => p.putaran === a.putaranBerjalan);
          const sudahBayarIds = new Set(bayarPutaran.map((p) => p.userId));
          const saldoBerjalan = bayarPutaran.length * Number(a.jumlahSetoran);
          const pot = a.peserta.length * Number(a.jumlahSetoran);
          const potongan = (pot * Number(a.potonganPersen)) / 100;
          const potBersih = pot - potongan;
          const belumDapat = a.peserta.filter((p) => !p.statusDapat);
          const adaUndianAktif = a.undian.some((u) => u.status === "menang" && u.putaran === a.putaranBerjalan);

          return (
            <Card key={a.id} className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.periode}</p>
                  <p className="text-xs text-muted">
                    Putaran {a.putaranBerjalan} · {rupiah.format(Number(a.jumlahSetoran))}/slot · {a.peserta.length} slot
                    {Number(a.potonganPersen) > 0 && ` · potongan ${Number(a.potonganPersen)}%${a.potonganKeterangan ? ` (${a.potonganKeterangan})` : ""}`}
                  </p>
                </div>
                <Badge tone={a.status === "selesai" ? "success" : "primary"}>{a.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Terkumpul Putaran Ini"
                  value={rupiah.format(saldoBerjalan)}
                  icon={CircleDollarSign}
                  sub={`${bayarPutaran.length}/${a.peserta.length} slot sudah bayar`}
                />
                <StatCard
                  label="Diterima Pemenang"
                  value={rupiah.format(potBersih / Math.max(1, a.pemenangPerPutaran))}
                  icon={Trophy}
                  tone="success"
                  sub={Number(a.potonganPersen) > 0 ? `pot ${rupiah.format(pot)} − potongan ${rupiah.format(potongan)}` : `pot penuh ${rupiah.format(pot)}`}
                />
              </div>

              {a.kandidatTuanRumah && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent/5 p-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Home className="h-4 w-4 text-accent" />
                    Kandidat tuan rumah berikutnya: <strong>{a.kandidatTuanRumah.user.name}</strong>
                  </span>
                  {canAtur && (
                    <form action={tolakTuanRumahAction}>
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="arisanId" value={a.id} />
                      <button className={`${btnGhost} px-2 py-1 text-xs`}>Tidak bersedia</button>
                    </form>
                  )}
                </div>
              )}

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Dices className="h-4 w-4 text-primary" /> Kocokan Putaran {a.putaranBerjalan}
                </h3>
                <SpinWheel
                  tenantId={tenantId}
                  arisanId={a.id}
                  slots={belumDapat.map((p) => ({ id: p.id, label: `${p.user.name.split(" ")[0]} ${p.nomorSlot}`, penuh: `${p.user.name}${p.nomorSlot > 1 ? ` ${p.nomorSlot}` : ""}` }))}
                  pemenangPerPutaran={a.pemenangPerPutaran}
                  potBersih={potBersih}
                  bisaKocok={canAtur}
                />
              </section>

              {a.undian.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Riwayat Kocokan</h3>
                  <ul className="space-y-1.5">
                    {a.undian.map((u) => (
                      <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                        <span>
                          Putaran {u.putaran} ·{" "}
                          <strong>
                            {u.peserta.user.name}
                            {u.peserta.nomorSlot > 1 ? ` ${u.peserta.nomorSlot}` : ""}
                          </strong>{" "}
                          · {rupiah.format(Number(u.jumlahDiterima))}{" "}
                          {u.status === "dibatalkan" && <Badge tone="danger">dibatalkan</Badge>}
                        </span>
                        {canAtur && u.status === "menang" && (
                          <form action={batalkanUndianAction} className="flex gap-1">
                            <input type="hidden" name="tenantId" value={tenantId} />
                            <input type="hidden" name="undianId" value={u.id} />
                            <input name="catatan" placeholder="Alasan (opsional)" className={`${inputClass} px-2 py-0.5 text-[11px]`} />
                            <button className={`${btnGhost} px-2 py-0.5 text-[11px]`}>Batalkan</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                  {canAtur && adaUndianAktif && (
                    <form action={lanjutPutaranAction} className="mt-2">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="arisanId" value={a.id} />
                      <button className={`${btnGhost} w-full`}>Lanjut ke Putaran {a.putaranBerjalan + 1}</button>
                    </form>
                  )}
                </section>
              )}

              <section>
                <h3 className="mb-2 text-sm font-semibold">Slot Peserta & Status Bayar</h3>
                {a.peserta.length === 0 ? (
                  <p className="text-xs text-muted">Belum ada slot peserta.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {a.peserta.map((p) => {
                      const sudah = sudahBayarIds.has(p.userId);
                      return (
                        <li
                          key={p.id}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm ${p.userId === viewerId ? "bg-primary/5" : ""}`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-border text-xs font-medium">{p.urutan}</span>
                            <span className="truncate">
                              {p.user.name}
                              {p.nomorSlot > 1 && <span className="text-muted"> {p.nomorSlot}</span>}
                              {p.userId === viewerId && <Badge tone="primary">Anda</Badge>}
                              {p.statusDapat && <Badge tone="muted">sudah dapat</Badge>}
                            </span>
                          </span>
                          <span className="flex flex-shrink-0 flex-wrap items-center gap-1">
                            {sudah ? (
                              <Badge tone="success">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Sudah Bayar
                              </Badge>
                            ) : (
                              <Badge tone="warning">
                                <Clock className="mr-1 h-3 w-3" /> Belum Bayar
                              </Badge>
                            )}
                            {canTandaiBayar && (
                              <form action={toggleBayarAction}>
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <input type="hidden" name="arisanId" value={a.id} />
                                <input type="hidden" name="userId" value={p.userId} />
                                <button className="rounded-md border border-border px-1.5 py-0.5 text-[11px]">{sudah ? "Batal" : "Tandai"}</button>
                              </form>
                            )}
                            {canAtur && (
                              <>
                                <form action={toggleSudahDapatAction}>
                                  <input type="hidden" name="tenantId" value={tenantId} />
                                  <input type="hidden" name="pesertaId" value={p.id} />
                                  <button className="rounded-md border border-border px-1.5 py-0.5 text-[11px]" title="Tandai sudah pernah dapat tanpa diundi">
                                    {p.statusDapat ? "Ikutkan lagi" : "Sudah dapat"}
                                  </button>
                                </form>
                                <form action={hapusPesertaAction}>
                                  <input type="hidden" name="tenantId" value={tenantId} />
                                  <input type="hidden" name="pesertaId" value={p.id} />
                                  <button className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-danger">Hapus</button>
                                </form>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {canAtur && (
                  <form action={addPesertaAction} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="arisanId" value={a.id} />
                    <select name="userId" required className={`${inputClass} flex-1`}>
                      {anggota.map((m) => (
                        <option key={m.id} value={m.userId}>
                          {m.user.name}
                        </option>
                      ))}
                    </select>
                    <input type="number" name="jumlahSlot" min="1" max="20" defaultValue={1} title="Jumlah slot" className={`${inputClass} w-20`} />
                    <label className="flex items-center gap-1 text-xs text-muted">
                      <input type="checkbox" name="sudahDapat" />
                      sudah pernah dapat
                    </label>
                    <button className={btnGhost}>Tambah Slot</button>
                  </form>
                )}
              </section>
            </Card>
          );
        })
      )}
    </div>
  );
}
