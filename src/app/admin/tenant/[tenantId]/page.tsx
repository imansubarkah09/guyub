import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner, ROLE_LABEL } from "@/lib/authz";
import { Card, PageTitle, Badge, btnPrimary, btnGhost, tanggal } from "@/components/ui";
import { startPreviewAction } from "../../actions";

const ROLES = ["pemilik", "ketua", "wakil_ketua", "bendahara", "sekretaris", "anggota"] as const;
const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;

export default async function AdminTenantPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const user = await requireUser();
  requirePlatformOwner(user);
  const { tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { profile: true, memberships: { where: { status: "active" }, include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-5">
      <PageTitle
        title={tenant.profile?.nama ?? "(tanpa nama)"}
        desc={`${JENIS_LABEL[tenant.jenis]} · ${tenant.memberships.length} anggota · daftar ${tanggal.format(tenant.createdAt)}`}
        action={
          <Link href="/admin" className={btnGhost}>
            Kembali
          </Link>
        }
      />

      <Card>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Eye className="h-4 w-4 text-accent" /> Preview as Role
        </h2>
        <p className="mb-3 text-xs text-muted">Melihat tampilan tenant ini sebagai role tertentu. Semua aksi tulis dinonaktifkan.</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <form key={role} action={startPreviewAction}>
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="mode" value="role" />
              <input type="hidden" name="value" value={role} />
              <button className={btnGhost}>{ROLE_LABEL[role]}</button>
            </form>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <UserRound className="h-4 w-4 text-accent" /> Preview as User
        </h2>
        <p className="mb-3 text-xs text-muted">Melihat persis seperti yang dilihat anggota tersebut, termasuk data personalnya.</p>
        {tenant.memberships.length === 0 ? (
          <p className="text-sm text-muted">Belum ada anggota aktif.</p>
        ) : (
          <ul className="space-y-2">
            {tenant.memberships.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="truncate text-sm font-medium">{m.user.name}</span>
                  <span className="ml-1 text-xs text-muted">{m.user.email}</span>
                  <span className="ml-1 inline-flex gap-1">
                    {m.roles.map((r) => (
                      <Badge key={r} tone={r === "anggota" ? "muted" : "primary"}>
                        {r}
                      </Badge>
                    ))}
                  </span>
                </span>
                <form action={startPreviewAction}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="mode" value="user" />
                  <input type="hidden" name="value" value={m.userId} />
                  <button className={btnPrimary}>Preview</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
