import { PiggyBank, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { Card, PageTitle, EmptyState, Badge, Progress, btnPrimary, btnGhost, inputClass, rupiah } from "@/components/ui";
import { createTabunganTipeAction, setorAction, submitSetoranBuktiAction, submitSetoranXenditAction, validasiSetoranAction } from "./actions";

const XENDIT_READY = Boolean(process.env.XENDIT_API_KEY) && process.env.XENDIT_API_KEY !== "your_xendit_api_key_here";

export default async function TabunganPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const { roles, readOnly } = await effectiveRoles(user, tenantId);
  const viewerId = await viewerUserId(user, tenantId);

  const [tipeList, anggota, pendingSetoran] = await Promise.all([
    prisma.tabunganTipe.findMany({
      where: { tenantId },
      include: { saldo: { include: { user: true } }, setoran: { where: { status: "valid" }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 10 } },
      orderBy: { nama: "asc" },
    }),
    prisma.membership.findMany({ where: { tenantId, status: "active" }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    // Xendit tervalidasi otomatis lewat webhook — jangan ikut antrean validasi manual.
    prisma.tabunganSetoran.findMany({
      where: { status: "pending", metode: "manual", tabunganTipe: { tenantId } },
      include: { user: true, tabunganTipe: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const canKelola = has(roles, CAN_CATAT_UANG) && !readOnly;

  return (
    <div className="space-y-5">
      <PageTitle title="Tabungan" desc="Semua jenis tabungan tenant beserta saldo per anggota" />

      {canKelola && pendingSetoran.length > 0 && (
        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-warning" /> Menunggu Validasi ({pendingSetoran.length})
          </h2>
          <ul className="space-y-2">
            {pendingSetoran.map((s) => (
              <li key={s.id} className="rounded-lg border border-border p-2 text-sm">
                <p>
                  {s.user.name} · {s.tabunganTipe.nama} · <span className="tabular-nums">{rupiah.format(Number(s.jumlah))}</span>
                </p>
                {s.buktiUrl && (
                  <a href={s.buktiUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Lihat bukti transfer
                  </a>
                )}
                <form action={validasiSetoranAction} className="mt-1.5 flex gap-2">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="setoranId" value={s.id} />
                  <button name="decision" value="valid" className={btnPrimary}>
                    Validasi
                  </button>
                  <button name="decision" value="ditolak" className={btnGhost}>
                    Tolak
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canKelola && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Buat Jenis Tabungan</h2>
          <form action={createTabunganTipeAction} className="space-y-2">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input name="nama" required placeholder="Nama, misal: Tabungan Lebaran" className={inputClass} />
            <select name="mode" required className={inputClass}>
              <option value="individual">Individual (saldo per anggota)</option>
              <option value="pooled">Pooled (saldo bersama)</option>
            </select>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Buat Jenis Tabungan
            </button>
          </form>
        </Card>
      )}

      {tipeList.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Belum ada jenis tabungan"
          desc={canKelola ? "Buat jenis tabungan pertama lewat form di atas." : "Bendahara belum membuat jenis tabungan di tenant ini."}
        />
      ) : (
        <div className="space-y-4">
          {tipeList.map((tipe) => {
            const total = tipe.saldo.reduce((a, s) => a + Number(s.jumlah), 0);
            const target = Math.max(...tipe.saldo.map((s) => Number(s.jumlah)), 1);
            return (
              <Card key={tipe.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{tipe.nama}</p>
                    <Badge tone={tipe.mode === "pooled" ? "primary" : "muted"}>{tipe.mode === "pooled" ? "Bersama" : "Per anggota"}</Badge>
                  </div>
                  <p className="text-right text-lg font-semibold tabular-nums">{rupiah.format(total)}</p>
                </div>

                {tipe.mode === "individual" ? (
                  <ul className="mt-3 space-y-2">
                    {anggota.map((m) => {
                      const s = tipe.saldo.find((x) => x.userId === m.userId);
                      const jumlah = Number(s?.jumlah ?? 0);
                      return (
                        <li key={m.id} className={`rounded-lg p-2 ${m.userId === viewerId ? "bg-primary/5" : ""}`}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">
                              {m.user.name} {m.userId === viewerId && <Badge tone="primary">Anda</Badge>}
                            </span>
                            <span className="tabular-nums">{rupiah.format(jumlah)}</span>
                          </div>
                          <div className="mt-1">
                            <Progress value={(jumlah / target) * 100} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="mt-3 space-y-1 text-sm">
                    {tipe.setoran.length === 0 ? (
                      <p className="text-xs text-muted">Belum ada riwayat setoran.</p>
                    ) : (
                      tipe.setoran.map((s) => (
                        <li key={s.id} className="flex justify-between text-xs">
                          <span>{s.user.name}</span>
                          <span className="tabular-nums">{rupiah.format(Number(s.jumlah))}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}

                {canKelola && (
                  <form action={setorAction} className="mt-3 flex flex-col gap-2 border-t border-border pt-3 min-[420px]:flex-row">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="tabunganTipeId" value={tipe.id} />
                    {tipe.mode === "individual" && (
                      <select name="userId" required className={inputClass}>
                        {anggota.map((m) => (
                          <option key={m.id} value={m.userId}>
                            {m.user.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input type="number" name="jumlah" min="1" step="1" required placeholder="Setoran tunai (Rp)" className={inputClass} />
                    <button className={btnGhost}>Catat</button>
                  </form>
                )}

                {!readOnly && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-xs text-muted">Sudah transfer sendiri? Ajukan dengan bukti untuk divalidasi bendahara.</p>
                    <form action={submitSetoranBuktiAction} className="flex flex-col gap-2 min-[420px]:flex-row" encType="multipart/form-data">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="tabunganTipeId" value={tipe.id} />
                      <input type="number" name="jumlah" min="1" step="1" required placeholder="Jumlah (Rp)" className={inputClass} />
                      <input type="file" name="bukti" accept="image/*" required className="flex-1 text-xs" />
                      <button className={btnGhost}>Ajukan</button>
                    </form>
                    {XENDIT_READY && (
                      <form action={submitSetoranXenditAction} className="flex flex-col gap-2 min-[420px]:flex-row">
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="tabunganTipeId" value={tipe.id} />
                        <input type="number" name="jumlah" min="1" step="1" required placeholder="Bayar langsung (Rp)" className={inputClass} />
                        <button className={btnPrimary}>Bayar via Xendit</button>
                      </form>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
