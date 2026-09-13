import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_TABUNGAN } from "@/lib/authz";
import { createQurbanGroupAction, joinQurbanSlotAction, setorQurbanAction } from "./actions";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const ANIMAL = { sapi: "🐄", kambing: "🐐" } as const;
const MAX_SLOT = { sapi: 7, kambing: 1 } as const;

export default async function QurbanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, groups] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.qurbanGroup.findMany({ where: { tenantId }, include: { slots: { include: { user: true } } }, orderBy: { id: "desc" } }),
  ]);

  const canKelola = me.roles.some((r) => CAN_KELOLA_TABUNGAN.includes(r));

  return (
    <div className="space-y-4">
      {canKelola && (
        <form action={createQurbanGroupAction} className="space-y-2 rounded-md border border-primary/15 p-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <select name="jenisHewan" required className="w-full rounded-md border border-primary/30 p-2 text-sm">
            <option value="sapi">Sapi (7 jiwa)</option>
            <option value="kambing">Kambing (1 jiwa)</option>
          </select>
          <input type="number" name="targetPerJiwa" min="0" step="1" required placeholder="Target per jiwa (Rp)" className="w-full rounded-md border border-primary/30 p-2 text-sm" />
          <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
            Buka Qurban Joinan
          </button>
        </form>
      )}

      {groups.map((g) => {
        const max = MAX_SLOT[g.jenisHewan];
        const canJoin = g.slots.length < max && !g.slots.some((s) => s.userId === user.id);
        return (
          <div key={g.id} className="rounded-md border border-primary/15 p-3">
            <p className="font-medium">
              {ANIMAL[g.jenisHewan]} {g.jenisHewan} · {g.slots.length}/{max} jiwa · {g.status}
            </p>
            <ul className="mt-2 space-y-2">
              {g.slots.map((s) => {
                const pct = Math.min(100, (Number(s.saldoTerkumpul) / Number(g.targetPerJiwa)) * 100);
                return (
                  <li key={s.id} className="text-sm">
                    <div className="flex justify-between">
                      <span>{s.user.name}</span>
                      <span>
                        {rupiah.format(Number(s.saldoTerkumpul))} / {rupiah.format(Number(g.targetPerJiwa))}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-primary/10">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    {canKelola && s.status !== "lunas" && (
                      <form action={setorQurbanAction} className="mt-1 flex gap-2">
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="slotId" value={s.id} />
                        <input type="number" name="jumlah" min="1" step="1" required placeholder="Setoran (Rp)" className="flex-1 rounded-md border border-primary/30 p-1 text-xs" />
                        <button className="rounded-md border border-primary/30 px-2 text-xs">Catat</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            {canJoin && (
              <form action={joinQurbanSlotAction} className="mt-2">
                <input type="hidden" name="tenantId" value={tenantId} />
                <input type="hidden" name="qurbanGroupId" value={g.id} />
                <button className="w-full rounded-md bg-primary py-1.5 text-xs font-medium text-primary-foreground">Gabung Slot</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
