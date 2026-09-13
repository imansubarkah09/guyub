import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getPreview } from "@/lib/preview";
import { KETUA } from "@/lib/authz";
import { Card } from "@/components/ui";
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
  const preview = await getPreview(user);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { profile: true, approvalRequest: true },
  });
  if (!tenant) notFound();

  // Platform owner dalam mode preview tenant ini boleh melihat tanpa jadi anggota (§7.2).
  const previewingThis = preview?.tenantId === tenantId;
  const membership = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: user.id, tenantId } } });

  if (!previewingThis) {
    if (!membership) notFound();
    if (membership.status !== "active") {
      return (
        <Shell>
          {membership.status === "pending_confirmation"
            ? "Permintaan Anda bergabung ke tenant ini masih menunggu konfirmasi pengurus."
            : "Anda sudah tidak menjadi anggota tenant ini."}
        </Shell>
      );
    }
    if (tenant.status !== "approved") {
      return (
        <Shell>
          {tenant.approvalRequest?.status === "rejected"
            ? `Pendaftaran tenant ini ditolak Platform Owner.${tenant.approvalRequest.catatanOwner ? ` Catatan: ${tenant.approvalRequest.catatanOwner}` : ""}`
            : "Menunggu persetujuan Platform Owner sebelum tenant ini bisa dipakai."}
        </Shell>
      );
    }
  }

  // Role efektif: saat preview, pakai role yang sedang di-preview (read-only tetap dipaksa di server).
  let roles = membership?.roles ?? [];
  let previewLabel: string | null = null;
  if (previewingThis) {
    if (preview?.userId) {
      const target = await prisma.membership.findUnique({
        where: { userId_tenantId: { userId: preview.userId, tenantId } },
        include: { user: true },
      });
      roles = target?.roles ?? ["anggota"];
      previewLabel = `melihat sebagai ${target?.user.name ?? "anggota"} di ${tenant.profile?.nama ?? "tenant"}`;
    } else {
      roles = preview?.role ? [preview.role] : ["anggota"];
      previewLabel = `melihat sebagai ${preview?.role ?? "anggota"} di ${tenant.profile?.nama ?? "tenant"}`;
    }
  }

  const [notif, unread] = await Promise.all([
    prisma.notifikasi.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.notifikasi.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return (
    <TenantShell
      tenantId={tenantId}
      tenantNama={tenant.profile?.nama ?? "Guyub"}
      account={{ name: user.name, email: user.email, phone: user.phone ?? null, image: user.image ?? null, isPlatformOwner: user.isPlatformOwner }}
      notif={notif.map((n) => ({
        id: n.id,
        pesan: n.pesan,
        href: n.href,
        isRead: n.isRead,
        createdAt: n.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      }))}
      unread={unread}
      isKetua={roles.some((r) => KETUA.includes(r))}
      previewLabel={previewLabel}
    >
      {children}
    </TenantShell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg p-4">
      <Card>
        <p className="text-sm">{children}</p>
        <a href="/dashboard" className="mt-2 inline-block text-sm text-primary underline">
          Kembali ke Dashboard
        </a>
      </Card>
    </main>
  );
}
