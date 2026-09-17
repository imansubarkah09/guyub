import { UserPlus, Link2, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_ANGGOTA, PENGURUS, KETUA, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { waShareUrl } from "@/lib/whatsapp";
import { Card, PageTitle, btnPrimary, btnGhost, inputClass } from "@/components/ui";
import { generateInviteAction, revokeInviteAction, confirmMemberAction } from "./actions";
import { AnggotaAktifList } from "./anggota-aktif-list";

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
  // Approve anggota baru boleh lebih longgar dari kelola peran/undangan: seluruh
  // pengurus (termasuk bendahara), bukan cuma ketua/wakil ketua/sekretaris
  // (permintaan Iman, 16 Sep 2026).
  const canApprove = has(roles, PENGURUS);
  // Cuma ketua/wakil ketua yang menjabat atau platform owner yang boleh ubah
  // peran ketua (koreksi salah klik, serah terima), sekretaris tidak (ketemu
  // 16 Sep 2026: sekretaris salah klik menjadikan anggota lain ketua, dan lock
  // sebelumnya keliru ikut mengunci ketua/owner sendiri juga).
  const bisaUbahKetua = has(roles, KETUA) || user.isPlatformOwner;
  const base = process.env.NEXT_PUBLIC_URL ?? "";
  const pending = memberships.filter((m) => m.status === "pending_confirmation");
  const active = memberships
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.id,
      userId: m.userId,
      roles: m.roles,
      isPengurus: has(m.roles, PENGURUS),
      user: { name: m.user.name, email: m.user.email, image: m.user.image },
    }));

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
                    <button className={`${btnGhost} text-danger hover:bg-danger/5`}>Cabut</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {canApprove && pending.length > 0 && (
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
        <AnggotaAktifList tenantId={tenantId} active={active} viewerId={viewerId} canKelola={canKelola} bisaUbahKetua={bisaUbahKetua} />
      </section>
    </div>
  );
}
