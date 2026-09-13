import { HandCoins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { pesanGamifiedQurban } from "@/lib/ringkasan";
import { Card, PageTitle, StatCard, EmptyState, Badge, Progress, btnPrimary, btnGhost, inputClass, rupiah } from "@/components/ui";
import { createQurbanGroupAction, joinQurbanSlotAction, setorQurbanAction } from "./actions";
import { EditGroupButton, EditSlotButton } from "./edit-controls";

const MAX_SLOT = { sapi: 7, kambing: 1 } as const;

export default async function QurbanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const { roles, readOnly } = await effectiveRoles(user, tenantId);
  const viewerId = await viewerUserId(user, tenantId);

  const groups = await prisma.qurbanGroup.findMany({
    where: { tenantId },
    include: { slots: { include: { user: true }, orderBy: { id: "asc" } } },
    orderBy: { id: "desc" },
  });

  const canKelola = has(roles, CAN_CATAT_UANG) && !readOnly;

  // Rekap agregat tenant (§7.6).
  const rekap = { kambingLunas: 0, kambingTerbuka: 0, sapiLunas: 0, sapiTerbuka: 0, jiwaSapiTerisi: 0, jiwaSapiTotal: 0, total: 0 };
  for (const g of groups) {
    const max = MAX_SLOT[g.jenisHewan];
    const lunasCount = g.slots.filter((s) => s.status === "lunas").length;
    const selesai = lunasCount === max;
    rekap.total += g.slots.reduce((a, s) => a + Number(s.saldoTerkumpul), 0);
    if (g.jenisHewan === "kambing") {
      if (selesai) rekap.kambingLunas++;
      else rekap.kambingTerbuka++;
    } else {
      if (selesai) rekap.sapiLunas++;
      else rekap.sapiTerbuka++;
      rekap.jiwaSapiTerisi += g.slots.length;
      rekap.jiwaSapiTotal += max;
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Qurban Joinan" desc="Patungan qurban per jiwa — kambing 1 jiwa, sapi 7 jiwa" />

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Total Terkumpul" value={rupiah.format(rekap.total)} icon={HandCoins} />
        <StatCard
          label="Hewan Qurban"
          value={`${rekap.kambingLunas + rekap.sapiLunas} lunas`}
          tone="success"
          sub={
            <>
              🐐 {rekap.kambingLunas} lunas / {rekap.kambingTerbuka} terbuka · 🐄 {rekap.sapiLunas} lunas / {rekap.sapiTerbuka} terbuka
              {rekap.jiwaSapiTotal > 0 && ` · jiwa sapi ${rekap.jiwaSapiTerisi}/${rekap.jiwaSapiTotal}`}
            </>
          }
        />
      </section>

      {canKelola && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Buka Qurban Joinan</h2>
          <form action={createQurbanGroupAction} className="space-y-2">
            <input type="hidden" name="tenantId" value={tenantId} />
            <select name="jenisHewan" required className={inputClass}>
              <option value="sapi">🐄 Sapi (7 jiwa)</option>
              <option value="kambing">🐐 Kambing (1 jiwa)</option>
            </select>
            <input type="number" name="targetPerJiwa" min="0" step="1" required placeholder="Target per jiwa (Rp)" className={inputClass} />
            <button type="submit" className={`${btnPrimary} w-full`}>
              Buka Joinan
            </button>
          </form>
        </Card>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Belum ada qurban joinan"
          desc={canKelola ? "Buka joinan kambing atau sapi lewat form di atas." : "Bendahara belum membuka program qurban joinan."}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const max = MAX_SLOT[g.jenisHewan];
            const lunasNama = g.slots.filter((s) => s.status === "lunas").map((s) => s.user.name);
            const canJoin = !readOnly && g.slots.length < max && !g.slots.some((s) => s.userId === viewerId);
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {g.jenisHewan === "sapi" ? "🐄" : "🐐"} Qurban {g.jenisHewan}
                    </p>
                    <p className="text-xs text-muted">Target {rupiah.format(Number(g.targetPerJiwa))} / jiwa</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={g.status === "lunas" ? "success" : "primary"}>
                      {g.slots.length}/{max} jiwa
                    </Badge>
                    {canKelola && (
                      <EditGroupButton tenantId={tenantId} group={{ id: g.id, jenisHewan: g.jenisHewan, targetPerJiwa: g.targetPerJiwa.toString() }} />
                    )}
                  </div>
                </div>

                <p className="mt-2 rounded-lg bg-primary/5 p-2 text-xs">{pesanGamifiedQurban({ jenisHewan: g.jenisHewan, max, terisi: g.slots.length, lunasNama })}</p>

                <ul className="mt-3 space-y-2">
                  {g.slots.map((s) => {
                    const pct = (Number(s.saldoTerkumpul) / Number(g.targetPerJiwa)) * 100;
                    return (
                      <li key={s.id} className={`rounded-lg p-2 ${s.userId === viewerId ? "bg-primary/5" : ""}`}>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">
                            {s.user.name} {s.userId === viewerId && <Badge tone="primary">Anda</Badge>}
                            {s.status === "lunas" && <Badge tone="success">Lunas</Badge>}
                          </span>
                          <span className="flex items-center gap-1 text-xs tabular-nums">
                            {rupiah.format(Number(s.saldoTerkumpul))}
                            {canKelola && <EditSlotButton tenantId={tenantId} slotId={s.id} saldoTerkumpul={s.saldoTerkumpul.toString()} />}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Progress value={pct} />
                        </div>
                        {canKelola && s.status !== "lunas" && (
                          <form action={setorQurbanAction} className="mt-1.5 flex gap-2">
                            <input type="hidden" name="tenantId" value={tenantId} />
                            <input type="hidden" name="slotId" value={s.id} />
                            <input type="number" name="jumlah" min="1" step="1" required placeholder="Setoran (Rp)" className={`${inputClass} py-1 text-xs`} />
                            <button className={`${btnGhost} px-2 py-1 text-xs`}>Catat</button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {canJoin && (
                  <form action={joinQurbanSlotAction} className="mt-3">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="qurbanGroupId" value={g.id} />
                    <button className={`${btnPrimary} w-full`}>Gabung Slot Qurban</button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
