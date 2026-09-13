import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { createTabunganTipeAction, setorAction, submitSetoranBuktiAction, submitSetoranXenditAction, validasiSetoranAction } from "./actions";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const XENDIT_READY = Boolean(process.env.XENDIT_API_KEY) && process.env.XENDIT_API_KEY !== "your_xendit_api_key_here";

export default async function TabunganPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, tipeList, anggota, pendingSetoran] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.tabunganTipe.findMany({ where: { tenantId }, include: { saldo: { include: { user: true } } }, orderBy: { nama: "asc" } }),
    prisma.membership.findMany({ where: { tenantId, status: "active" }, include: { user: true } }),
    // Xendit setoran self-validate via webhook — showing them here would let a
    // bendahara double-credit one that's just mid-payment.
    prisma.tabunganSetoran.findMany({
      where: { status: "pending", metode: "manual", tabunganTipe: { tenantId } },
      include: { user: true, tabunganTipe: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const canKelola = has(me.roles, CAN_CATAT_UANG);

  return (
    <div className="space-y-4">
      {canKelola && pendingSetoran.length > 0 && (
        <section className="rounded-md border border-primary/15 p-3">
          <h2 className="mb-2 text-sm font-semibold">Menunggu Validasi Setoran</h2>
          <ul className="space-y-2">
            {pendingSetoran.map((s) => (
              <li key={s.id} className="rounded-md border border-primary/15 p-2 text-sm">
                <p>
                  {s.user.name} · {s.tabunganTipe.nama} · {rupiah.format(Number(s.jumlah))}
                </p>
                {s.buktiUrl && (
                  <a href={s.buktiUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Lihat bukti transfer
                  </a>
                )}
                <form action={validasiSetoranAction} className="mt-1 flex gap-2">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="setoranId" value={s.id} />
                  <button name="decision" value="valid" className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                    Validasi
                  </button>
                  <button name="decision" value="ditolak" className="rounded-md border border-primary/30 px-2 py-1 text-xs">
                    Tolak
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                <input type="number" name="jumlah" min="1" step="1" required placeholder="Setoran tunai (Rp)" className="flex-1 rounded-md border border-primary/30 p-1.5 text-xs" />
                <button className="rounded-md border border-primary/30 px-3 py-1.5 text-xs">Catat Setoran</button>
              </form>
            )}

            {XENDIT_READY && (
              <form action={submitSetoranXenditAction} className="mt-2 flex flex-col gap-2 border-t border-primary/10 pt-2 min-[400px]:flex-row">
                <input type="hidden" name="tenantId" value={tenantId} />
                <input type="hidden" name="tabunganTipeId" value={tipe.id} />
                <input type="number" name="jumlah" min="1" step="1" required placeholder="Bayar langsung (Rp)" className="flex-1 rounded-md border border-primary/30 p-1.5 text-xs" />
                <button className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">Bayar via Xendit</button>
              </form>
            )}

            <form action={submitSetoranBuktiAction} className="mt-2 space-y-1 border-t border-primary/10 pt-2" encType="multipart/form-data">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="tabunganTipeId" value={tipe.id} />
              <p className="text-xs text-foreground/60">Sudah transfer manual? Ajukan setoran dengan bukti untuk divalidasi bendahara.</p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <input type="number" name="jumlah" min="1" step="1" required placeholder="Jumlah transfer (Rp)" className="flex-1 rounded-md border border-primary/30 p-1.5 text-xs" />
                <input type="file" name="bukti" accept="image/*" required className="flex-1 text-xs" />
                <button className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">Ajukan</button>
              </div>
            </form>
          </div>
        );
      })}
    </div>
  );
}
