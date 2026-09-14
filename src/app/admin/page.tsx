import Link from "next/link";
import { Building2, Search, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, btnGhost, inputClass, tanggal } from "@/components/ui";
import { decideTenantAction, suspendTenantAction } from "./actions";

const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;
const STATUS_TONE = { pending: "warning", approved: "success", suspended: "danger" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  requirePlatformOwner(user);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const tenants = await prisma.tenant.findMany({
    where: query ? { profile: { nama: { contains: query, mode: "insensitive" } } } : {},
    include: {
      profile: true,
      approvalRequest: true,
      // Dulu: SELURUH anggota aktif SETIAP tenant ditarik lengkap dengan baris User-nya,
      // padahal yang dipakai cuma nama ketua dan jumlah anggotanya.
      memberships: { where: { status: "active", roles: { has: "ketua" } }, take: 1, select: { user: { select: { name: true, email: true } } } },
      _count: { select: { memberships: { where: { status: "active" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = tenants.filter((t) => t.status === "pending");

  return (
    <main className="mx-auto max-w-3xl p-4 pb-16">
      <PageTitle
        title="Platform Owner"
        desc="Kelola semua tenant Guyub"
        action={
          <Link href="/dashboard" className={btnGhost}>
            Ke Dashboard
          </Link>
        }
      />

      {pending.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold">Menunggu Persetujuan ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((t) => {
              const ketua = t.memberships[0];
              return (
                <Card key={t.id} className="border-warning/30 bg-warning/5">
                  <p className="font-medium">{t.profile?.nama}</p>
                  <p className="text-xs text-muted">
                    {JENIS_LABEL[t.jenis]}
                    {t.profile?.alamat ? ` · ${t.profile.alamat}` : ""} · diajukan {ketua?.user.name ?? "-"} ({ketua?.user.email ?? "-"})
                  </p>
                  <form action={decideTenantAction} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="tenantId" value={t.id} />
                    <input name="catatan" placeholder="Catatan (opsional)" className={`${inputClass} flex-1`} />
                    <button name="decision" value="approved" className={btnPrimary}>
                      Setujui
                    </button>
                    <button name="decision" value="rejected" className={btnGhost}>
                      Tolak
                    </button>
                  </form>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Semua Tenant ({tenants.length})</h2>
          <form className="flex gap-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input name="q" defaultValue={query} placeholder="Cari nama tenant" className={`${inputClass} py-1 pl-8 text-xs`} />
            </div>
            <button className={`${btnGhost} px-2 py-1 text-xs`}>Cari</button>
          </form>
        </div>

        {tenants.length === 0 ? (
          <EmptyState icon={Building2} title="Belum ada tenant" desc="Tenant akan muncul di sini setelah ada yang mendaftar." />
        ) : (
          <ul className="space-y-2">
            {tenants.map((t) => (
              <li key={t.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.profile?.nama ?? "(tanpa nama)"}</p>
                    <p className="text-xs text-muted">
                      {JENIS_LABEL[t.jenis]} · {t._count.memberships} anggota · daftar {tanggal.format(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                    <Link href={`/admin/tenant/${t.id}`} className={`${btnGhost} px-2 py-1 text-xs`}>
                      Preview
                    </Link>
                    {t.status !== "pending" && (
                      <form action={suspendTenantAction}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <input type="hidden" name="suspend" value={String(t.status !== "suspended")} />
                        <button className={`${btnGhost} px-2 py-1 text-xs`}>{t.status === "suspended" ? "Aktifkan" : "Suspend"}</button>
                      </form>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="h-4 w-4" />
        Mode preview selalu read-only — semua aksi tulis ditolak server walau tombolnya dipaksa lewat API.
      </p>
      <Link href="/admin/trakteer" className="mt-2 mr-4 inline-block text-sm text-primary underline">Monitor Trakteer</Link>
      <Link href="/platform/owners" className="mt-2 inline-block text-sm text-primary underline">
        Kelola Platform Owner
      </Link>
    </main>
  );
}
