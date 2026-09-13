import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_KAS } from "@/lib/authz";
import { createArisanAction, addPesertaAction, toggleDapatAction } from "./actions";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function ArisanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, arisanList, anggota] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.arisan.findMany({
      where: { tenantId },
      include: { peserta: { include: { user: true }, orderBy: { urutan: "asc" } } },
      orderBy: { id: "desc" },
    }),
    prisma.membership.findMany({ where: { tenantId, status: "active" }, include: { user: true } }),
  ]);

  const canKelola = me.roles.some((r) => CAN_CATAT_KAS.includes(r));

  return (
    <div className="space-y-4">
      {canKelola && (
        <form action={createArisanAction} className="space-y-2 rounded-md border border-primary/15 p-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input name="periode" required placeholder="Periode, misal: Bulanan 2026" className="w-full rounded-md border border-primary/30 p-2 text-sm" />
          <input type="number" name="jumlahSetoran" min="0" step="1" required placeholder="Jumlah setoran per giliran (Rp)" className="w-full rounded-md border border-primary/30 p-2 text-sm" />
          <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
            Buat Arisan
          </button>
        </form>
      )}

      {arisanList.map((a) => {
        const pesertaIds = new Set(a.peserta.map((p) => p.userId));
        return (
          <div key={a.id} className="rounded-md border border-primary/15 p-3">
            <p className="font-medium">
              {a.periode} · {rupiah.format(Number(a.jumlahSetoran))}/giliran · {a.status}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {a.peserta.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>
                    #{p.urutan} {p.user.name}
                  </span>
                  {p.statusDapat ? (
                    <span className="text-xs text-emerald-700">Sudah dapat</span>
                  ) : canKelola ? (
                    <form action={toggleDapatAction}>
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="pesertaId" value={p.id} />
                      <button className="rounded-md border border-primary/30 px-2 py-0.5 text-xs">Tandai Dapat</button>
                    </form>
                  ) : (
                    <span className="text-xs text-foreground/50">Belum</span>
                  )}
                </li>
              ))}
            </ul>
            {canKelola && (
              <form action={addPesertaAction} className="mt-2 flex gap-2">
                <input type="hidden" name="tenantId" value={tenantId} />
                <input type="hidden" name="arisanId" value={a.id} />
                <select name="userId" required className="flex-1 rounded-md border border-primary/30 p-1 text-xs">
                  {anggota
                    .filter((m) => !pesertaIds.has(m.userId))
                    .map((m) => (
                      <option key={m.id} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                </select>
                <button className="rounded-md border border-primary/30 px-2 text-xs">Tambah Peserta</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
