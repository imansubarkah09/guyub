import { prisma } from "@/lib/prisma";

const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;

export default async function TenantHomePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      profile: true,
      memberships: { where: { status: "active" }, include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{tenant.profile?.nama}</h1>
        <p className="text-sm text-foreground/60">
          {JENIS_LABEL[tenant.jenis]} · {tenant.memberships.length} anggota aktif
        </p>
        {tenant.profile?.alamat && <p className="text-sm text-foreground/60">{tenant.profile.alamat}</p>}
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold">Pengurus</h2>
        <ul className="space-y-1 text-sm">
          {tenant.memberships
            .filter((m) => m.roles.some((r) => r !== "anggota"))
            .map((m) => (
              <li key={m.id}>
                {m.user.name} — {m.roles.join(", ")}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
