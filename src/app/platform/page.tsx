import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { AppHeader } from "@/components/app-header";
import { decideTenantAction } from "./actions";

const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;

export default async function PlatformPage() {
  const user = await requireUser();
  requirePlatformOwner(user);

  const requests = await prisma.tenantApprovalRequest.findMany({
    where: { status: "pending" },
    include: { tenant: { include: { profile: true, memberships: { include: { user: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen">
      <AppHeader email={user.email} title="Guyub · Platform Owner" />
      <div className="mx-auto max-w-lg space-y-3 p-4">
        <a href="/platform/owners" className="text-sm text-primary underline">
          Kelola Platform Owner
        </a>
        <h1 className="text-lg font-semibold">Persetujuan Tenant Baru</h1>
        {requests.length === 0 && <p className="text-sm text-foreground/60">Tidak ada permintaan menunggu.</p>}
        {requests.map((r) => {
          const ketua = r.tenant.memberships.find((m) => m.roles.includes("ketua"));
          return (
            <div key={r.id} className="rounded-md border border-primary/15 p-3">
              <p className="font-medium">{r.tenant.profile?.nama}</p>
              <p className="text-xs text-foreground/60">
                {JENIS_LABEL[r.tenant.jenis]} · diajukan oleh {ketua?.user.name} ({ketua?.user.email})
              </p>
              <form action={decideTenantAction} className="mt-2 flex gap-2">
                <input type="hidden" name="tenantId" value={r.tenantId} />
                <input name="catatan" placeholder="Catatan (opsional)" className="flex-1 rounded-md border border-primary/30 p-1 text-xs" />
                <button name="decision" value="approved" className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                  Setujui
                </button>
                <button name="decision" value="rejected" className="rounded-md border border-primary/30 px-2 py-1 text-xs">
                  Tolak
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}
