import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_ANGGOTA, CAN_CONFIRM_ANGGOTA } from "@/lib/authz";
import { waShareUrl } from "@/lib/whatsapp";
import { generateInviteAction, revokeInviteAction, confirmMemberAction, updateRolesAction } from "./actions";

const ALL_ROLES = ["ketua", "bendahara", "sekretaris", "anggota"] as const;

export default async function AnggotaPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();

  const [me, memberships, invitations, tenant] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.membership.findMany({ where: { tenantId, status: { not: "removed" } }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { tenantId, status: "active" }, orderBy: { createdAt: "desc" } }),
    prisma.tenantProfile.findUniqueOrThrow({ where: { tenantId } }),
  ]);

  const canKelola = me.roles.some((r) => CAN_KELOLA_ANGGOTA.includes(r));
  const canConfirm = me.roles.some((r) => CAN_CONFIRM_ANGGOTA.includes(r));
  const base = process.env.NEXT_PUBLIC_URL ?? "";
  const pending = memberships.filter((m) => m.status === "pending_confirmation");
  const active = memberships.filter((m) => m.status === "active");

  return (
    <div className="space-y-6">
      {canKelola && (
        <section className="rounded-md border border-primary/15 p-3">
          <h2 className="mb-2 text-sm font-semibold">Undangan</h2>
          <form action={generateInviteAction} className="mb-2">
            <input type="hidden" name="tenantId" value={tenantId} />
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Buat Link Undangan</button>
          </form>
          <p className="mb-2 text-xs text-foreground/60">Sebar link ini sendiri lewat WhatsApp — jangan ditempel di tempat publik.</p>
          <ul className="space-y-2">
            {invitations.map((inv) => {
              const url = `${base}/invite/${inv.token}`;
              const waText = `Anda diundang bergabung ke ${tenant.nama} di Guyub, klik link ini untuk gabung: ${url}`;
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <input readOnly value={url} className="flex-1 rounded border border-primary/30 p-1" onFocus={(e) => e.currentTarget.select()} />
                  <a href={waShareUrl(waText)} target="_blank" rel="noreferrer" className="rounded border border-primary/30 px-2 py-1 text-emerald-700">
                    Bagikan ke WhatsApp
                  </a>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button className="rounded border border-primary/30 px-2 py-1">Cabut</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {canConfirm && pending.length > 0 && (
        <section className="rounded-md border border-primary/15 p-3">
          <h2 className="mb-2 text-sm font-semibold">Menunggu Konfirmasi</h2>
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span>
                  {m.user.name} ({m.user.email})
                </span>
                <form action={confirmMemberAction}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="membershipId" value={m.id} />
                  <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Konfirmasi</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Anggota Aktif</h2>
        <ul className="space-y-2">
          {active.map((m) => (
            <li key={m.id} className="rounded-md border border-primary/15 p-2 text-sm">
              <p className="font-medium">
                {m.user.name} <span className="font-normal text-foreground/60">({m.user.email})</span>
              </p>
              {canKelola ? (
                <form action={updateRolesAction} className="mt-1 flex flex-wrap gap-2 text-xs">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="membershipId" value={m.id} />
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1">
                      <input type="checkbox" name="roles" value={role} defaultChecked={m.roles.includes(role)} />
                      {role}
                    </label>
                  ))}
                  <button className="rounded border border-primary/30 px-2">Simpan</button>
                </form>
              ) : (
                <p className="text-xs text-foreground/60">{m.roles.join(", ")}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
