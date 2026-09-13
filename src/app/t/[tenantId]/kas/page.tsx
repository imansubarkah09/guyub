import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { createKasTransaksiAction } from "./actions";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function KasPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, transaksi] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.kasTransaksi.findMany({ where: { tenantId }, include: { dicatatOleh: true }, orderBy: { tanggal: "desc" } }),
  ]);

  const canCatat = has(me.roles, CAN_CATAT_UANG);
  const saldo = transaksi.reduce((acc, t) => acc + (t.tipe === "masuk" ? Number(t.jumlah) : -Number(t.jumlah)), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-primary/15 p-3">
        <p className="text-xs text-foreground/60">Saldo Kas</p>
        <p className="text-xl font-semibold">{rupiah.format(saldo)}</p>
      </div>

      {canCatat && (
        <form action={createKasTransaksiAction} className="space-y-2 rounded-md border border-primary/15 p-3" encType="multipart/form-data">
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="flex gap-2">
            <input type="date" name="tanggal" required defaultValue={new Date().toISOString().slice(0, 10)} className="flex-1 rounded-md border border-primary/30 p-2 text-sm" />
            <select name="tipe" required className="rounded-md border border-primary/30 p-2 text-sm">
              <option value="masuk">Masuk</option>
              <option value="keluar">Keluar</option>
            </select>
          </div>
          <input type="number" name="jumlah" min="0" step="1" required placeholder="Jumlah (Rp)" className="w-full rounded-md border border-primary/30 p-2 text-sm" />
          <input name="keterangan" placeholder="Keterangan" className="w-full rounded-md border border-primary/30 p-2 text-sm" />
          <div>
            <label className="mb-1 block text-xs text-foreground/60">Bukti transfer (opsional)</label>
            <input type="file" name="bukti" accept="image/*" className="w-full text-sm" />
          </div>
          <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
            Catat Transaksi
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {transaksi.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-md border border-primary/15 p-2 text-sm">
            <div>
              <p>{t.keterangan ?? "(tanpa keterangan)"}</p>
              <p className="text-xs text-foreground/60">
                {t.tanggal.toLocaleDateString("id-ID")} · dicatat {t.dicatatOleh.name}
                {t.buktiUrl && (
                  <>
                    {" · "}
                    <a href={t.buktiUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                      Lihat bukti
                    </a>
                  </>
                )}
              </p>
            </div>
            <span className={t.tipe === "masuk" ? "text-emerald-700" : "text-red-700"}>
              {t.tipe === "masuk" ? "+" : "-"}
              {rupiah.format(Number(t.jumlah))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
