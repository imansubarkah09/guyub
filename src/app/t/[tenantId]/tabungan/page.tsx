import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_TABUNGAN } from "@/lib/authz";
import { createTabunganTipeAction, setorAction } from "./actions";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function TabunganPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, tipeList, anggota] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.tabunganTipe.findMany({ where: { tenantId }, include: { saldo: { include: { user: true } } }, orderBy: { nama: "asc" } }),
    prisma.membership.findMany({ where: { tenantId, status: "active" }, include: { user: true } }),
  ]);

  const canKelola = me.roles.some((r) => CAN_KELOLA_TABUNGAN.includes(r));

  return (
    <div className="space-y-4">
      {canKelola && (
        <form action={createTabunganTipeAction} className="space-y-2 rounded-md border border-primary/15 p-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input name="nama" required placeholder="Nama, misal: Qurban" className="w-full rounded-md border border-primary/30 p-2 text-sm" />
          <select name="mode" required className="w-full rounded-md border border-primary/30 p-2 text-sm">
            <option value="individual">Individual (per anggota)</option>
            <option value="pooled">Pooled (bersama)</option>
          </select>
          <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
            Buat Jenis Tabungan
          </button>
        </form>
      )}

      {tipeList.map((tipe) => {
        const total = tipe.saldo.reduce((acc, s) => acc + Number(s.jumlah), 0);
        return (
          <div key={tipe.id} className="rounded-md border border-primary/15 p-3">
            <p className="font-medium">
              {tipe.nama} <span className="text-xs font-normal text-foreground/60">({tipe.mode === "pooled" ? "bersama" : "individual"})</span>
            </p>

            {tipe.mode === "pooled" ? (
              <p className="text-lg font-semibold">{rupiah.format(total)}</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {anggota.map((m) => {
                  const s = tipe.saldo.find((x) => x.userId === m.userId);
                  return (
                    <li key={m.id} className="flex justify-between">
                      <span>{m.user.name}</span>
                      <span>{rupiah.format(Number(s?.jumlah ?? 0))}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {canKelola && (
              <form action={setorAction} className="mt-2 flex flex-col gap-2 min-[400px]:flex-row">
                <input type="hidden" name="tenantId" value={tenantId} />
                <input type="hidden" name="tabunganTipeId" value={tipe.id} />
                {tipe.mode === "individual" && (
                  <select name="userId" required className="rounded-md border border-primary/30 p-1.5 text-xs">
                    {anggota.map((m) => (
                      <option key={m.id} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                )}
                <input type="number" name="jumlah" min="1" step="1" required placeholder="Setoran (Rp)" className="flex-1 rounded-md border border-primary/30 p-1.5 text-xs" />
                <button className="rounded-md border border-primary/30 px-3 py-1.5 text-xs">Catat Setoran</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
