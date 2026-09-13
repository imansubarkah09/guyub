import { CircleDollarSign, CheckCircle2, Clock, ChevronUp, ChevronDown, Trophy, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_ATUR_ARISAN, CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { Card, PageTitle, StatCard, EmptyState, Badge, btnPrimary, btnGhost, inputClass, rupiah, tanggal } from "@/components/ui";
import { createArisanAction, addPesertaAction, geserUrutanAction, toggleBayarAction, tutupPutaranAction } from "./actions";

export default async function ArisanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);
  const viewerId = await viewerUserId(user, tenantId);

  const [arisanList, anggota] = await Promise.all([
    prisma.arisan.findMany({
      where: { tenantId },
      include: { peserta: { include: { user: true }, orderBy: { urutan: "asc" } }, pembayaran: true },
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
        desc="Status bayar & saldo putaran berjalan"
        action={
          <a href={`/t/${tenantId}/arisan/jadwal`} className={btnGhost}>
            <CalendarDays className="h-4 w-4" /> Jadwal
          </a>
        }
      />

      {canAtur && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Buat Arisan Baru</h2>
          <form action={createArisanAction} className="space-y-2">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input name="periode" required placeholder="Periode, misal: Bulanan 2026" className={inputClass} />
            <input type="number" name="jumlahSetoran" min="0" step="1" required placeholder="Setoran per giliran (Rp)" className={inputClass} />
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
          desc={canAtur ? "Buat arisan pertama lewat form di atas, lalu tambahkan pesertanya." : "Pengurus belum membuat arisan di tenant ini."}
        />
      ) : (
        arisanList.map((a) => {
          const bayarPutaran = a.pembayaran.filter((p) => p.putaran === a.putaranBerjalan);
          const sudahBayarIds = new Set(bayarPutaran.map((p) => p.userId));
          const saldoBerjalan = bayarPutaran.length * Number(a.jumlahSetoran);
          const totalPot = a.peserta.length * Number(a.jumlahSetoran);
          const penerima = a.peserta.find((p) => !p.statusDapat);
          const pesertaIds = new Set(a.peserta.map((p) => p.userId));

          return (
            <Card key={a.id} className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.periode}</p>
                  <p className="text-xs text-muted">
                    Putaran {a.putaranBerjalan} · setoran {rupiah.format(Number(a.jumlahSetoran))}/orang
                  </p>
                </div>
                <Badge tone={a.status === "selesai" ? "success" : "primary"}>{a.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Terkumpul Putaran Ini"
                  value={rupiah.format(saldoBerjalan)}
                  icon={CircleDollarSign}
                  sub={`dari ${rupiah.format(totalPot)} · ${bayarPutaran.length}/${a.peserta.length} sudah bayar`}
                />
                <StatCard label="Giliran Penerima" value={penerima?.user.name ?? "Selesai semua"} icon={Trophy} tone="success" sub="Penerima putaran ini" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Status Bayar & Urutan Giliran</h3>
                  {canAtur && penerima && (
                    <form action={tutupPutaranAction}>
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="arisanId" value={a.id} />
                      <button className={`${btnGhost} px-2 py-1 text-xs`}>Tutup Putaran</button>
                    </form>
                  )}
                </div>

                {a.peserta.length === 0 ? (
                  <p className="text-xs text-muted">Belum ada peserta.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {a.peserta.map((p) => {
                      const sudah = sudahBayarIds.has(p.userId);
                      return (
                        <li
                          key={p.id}
                          className={`flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm ${p.userId === viewerId ? "bg-primary/5" : ""}`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-border text-xs font-medium">{p.urutan}</span>
                            <span className="truncate">
                              {p.user.name} {p.userId === viewerId && <Badge tone="primary">Anda</Badge>}
                              {p.statusDapat && <Badge tone="muted">sudah dapat</Badge>}
                            </span>
                          </span>
                          <span className="flex flex-shrink-0 items-center gap-1">
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
                                <form action={geserUrutanAction}>
                                  <input type="hidden" name="tenantId" value={tenantId} />
                                  <input type="hidden" name="pesertaId" value={p.id} />
                                  <input type="hidden" name="arah" value="naik" />
                                  <button aria-label="Naikkan urutan" className="rounded-md border border-border p-0.5">
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                </form>
                                <form action={geserUrutanAction}>
                                  <input type="hidden" name="tenantId" value={tenantId} />
                                  <input type="hidden" name="pesertaId" value={p.id} />
                                  <input type="hidden" name="arah" value="turun" />
                                  <button aria-label="Turunkan urutan" className="rounded-md border border-border p-0.5">
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </form>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {canAtur && anggota.some((m) => !pesertaIds.has(m.userId)) && (
                  <form action={addPesertaAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="arisanId" value={a.id} />
                    <select name="userId" required className={inputClass}>
                      {anggota
                        .filter((m) => !pesertaIds.has(m.userId))
                        .map((m) => (
                          <option key={m.id} value={m.userId}>
                            {m.user.name}
                          </option>
                        ))}
                    </select>
                    <button className={btnGhost}>Tambah</button>
                  </form>
                )}
              </div>

              {a.jadwalTanggal && (
                <p className="rounded-lg bg-accent/5 p-2 text-xs">
                  <CalendarDays className="mr-1 inline h-3 w-3 text-accent" />
                  Pertemuan berikutnya: {tanggal.format(a.jadwalTanggal)}
                  {a.jadwalTempat ? ` di ${a.jadwalTempat}` : ""}
                </p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
