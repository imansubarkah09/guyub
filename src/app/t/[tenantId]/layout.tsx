import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { TenantShell } from "./tenant-shell";

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
    <TenantShell tenantId={tenantId} tenantNama={tenant.profile?.nama} email={user.email}>
      {children}
    </TenantShell>
  );
}
