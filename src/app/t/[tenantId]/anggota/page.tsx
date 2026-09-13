import { Users, UserPlus, Link2, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_ANGGOTA, ROLE_LABEL, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { waShareUrl } from "@/lib/whatsapp";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, btnGhost, inputClass } from "@/components/ui";
import { generateInviteAction, revokeInviteAction, confirmMemberAction, updateRolesAction } from "./actions";

const ALL_ROLES = ["ketua", "wakil_ketua", "bendahara", "sekretaris", "anggota"] as const;

export default async function AnggotaPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);
  const viewerId = await viewerUserId(user, tenantId);

  const [memberships, invitations, tenant] = await Promise.all([
    prisma.membership.findMany({ where: { tenantId, status: { not: "removed" } }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { tenantId, status: "active" }, orderBy: { createdAt: "desc" } }),
    prisma.tenantProfile.findUniqueOrThrow({ where: { tenantId } }),
  ]);

  const canKelola = has(roles, CAN_KELOLA_ANGGOTA);
  const base = process.env.NEXT_PUBLIC_URL ?? "";
  const pending = memberships.filter((m) => m.status === "pending_confirmation");
  const active = memberships.filter((m) => m.status === "active");

  return (
    <div className="space-y-5">
      <PageTitle title="Anggota & Undangan" desc={`${active.length} anggota aktif${pending.length ? ` · ${pending.length} menunggu konfirmasi` : ""}`} />

      {canKelola && (
        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-primary" /> Link Undangan
          </h2>
          <p className="mb-3 text-xs text-muted">Sebar link ini sendiri lewat WhatsApp ke grup keluarga/RT — jangan ditempel di tempat publik.</p>
          <form action={generateInviteAction} className="mb-3">
            <input type="hidden" name="tenantId" value={tenantId} />
            <button className={btnPrimary}>
              <UserPlus className="h-4 w-4" /> Buat Link Undangan
            </button>
          </form>
          <ul className="space-y-2">
            {invitations.map((inv) => {
              const url = `${base}/invite/${inv.token}`;
              const waText = `Anda diundang bergabung ke ${tenant.nama} di Guyub, klik link ini untuk gabung: ${url}`;
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-2">
                  <input readOnly value={url} className={`${inputClass} flex-1 text-xs`} />
                  <a href={waShareUrl(waText)} target="_blank" rel="noreferrer" className={`${btnGhost} text-success`}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button className={btnGhost}>Cabut</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {canKelola && pending.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <h2 className="mb-2 text-sm font-semibold">Menunggu Konfirmasi</h2>
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {m.user.name} <span className="text-muted">({m.user.email})</span>
                </span>
                <form action={confirmMemberAction}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="membershipId" value={m.id} />
                  <button className={btnPrimary}>Konfirmasi</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Anggota Aktif</h2>
        {active.length === 0 ? (
          <EmptyState icon={Users} title="Belum ada anggota" desc="Buat link undangan dan sebarkan lewat WhatsApp untuk mengajak anggota." />
        ) : (
          <ul className="space-y-2">
            {active.map((m) => (
              <li key={m.id}>
                <Card className={m.userId === viewerId ? "bg-primary/5" : ""}>
                  <div className="flex items-center gap-2">
                    {m.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.image} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {m.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {m.user.name} {m.userId === viewerId && <Badge tone="primary">Anda</Badge>}
                      </p>
                      <p className="truncate text-xs text-muted">{m.user.email}</p>
                    </div>
                  </div>

                  {canKelola ? (
                    <form action={updateRolesAction} className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-xs">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="membershipId" value={m.id} />
                      {ALL_ROLES.map((role) => (
                        <label key={role} className="flex items-center gap-1 rounded-md border border-border px-2 py-1">
                          <input type="checkbox" name="roles" value={role} defaultChecked={m.roles.includes(role)} />
                          {ROLE_LABEL[role]}
                        </label>
                      ))}
                      <button className={`${btnGhost} px-2 py-1 text-xs`}>Simpan</button>
                    </form>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
                      {m.roles.map((r) => (
                        <Badge key={r} tone={r === "anggota" ? "muted" : "primary"}>
                          {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
