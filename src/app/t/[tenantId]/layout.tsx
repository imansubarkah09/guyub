import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";

const NAV = [
  { href: "", label: "Ringkasan" },
  { href: "/kas", label: "Kas" },
  { href: "/tabungan", label: "Tabungan" },
  { href: "/qurban", label: "Qurban" },
  { href: "/arisan", label: "Arisan" },
  { href: "/silsilah", label: "Silsilah" },
  { href: "/laporan", label: "Laporan" },
  { href: "/anggota", label: "Anggota" },
  { href: "/profil", label: "Profil" },
];

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    include: { tenant: { include: { profile: true, approvalRequest: true } } },
  });
  if (!membership || membership.status !== "active") notFound();

  const { tenant } = membership;

  if (tenant.status !== "approved") {
    return (
      <main className="min-h-screen">
        <AppHeader email={user.email} title={tenant.profile?.nama} />
        <div className="mx-auto max-w-lg p-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
            {tenant.approvalRequest?.status === "rejected" ? (
              <>
                <p className="font-medium">Pendaftaran tenant ini ditolak Platform Owner.</p>
                {tenant.approvalRequest.catatanOwner && <p className="mt-1 text-foreground/70">Catatan: {tenant.approvalRequest.catatanOwner}</p>}
              </>
            ) : (
              <p>Menunggu persetujuan Platform Owner sebelum tenant ini bisa dipakai.</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <AppHeader email={user.email} title={tenant.profile?.nama} />
      <nav className="flex gap-3 overflow-x-auto border-b border-primary/15 px-4 py-2 text-sm">
        {NAV.map((item) => (
          <a key={item.href} href={`/t/${tenantId}${item.href}`} className="whitespace-nowrap text-foreground/70 hover:text-primary">
            {item.label}
          </a>
        ))}
      </nav>
      <div className="mx-auto max-w-lg p-4">{children}</div>
    </main>
  );
}
