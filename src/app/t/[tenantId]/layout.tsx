import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getPreview } from "@/lib/preview";
import { KETUA } from "@/lib/authz";
import { membershipSaya } from "@/lib/effective-roles";
import { tenantDenganProfil } from "@/lib/tenant";
import { TIMEZONE_WIB } from "@/lib/waktu";
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

  const tenant = await tenantDenganProfil(tenantId);
  if (!tenant) notFound();

  // Platform owner dalam mode preview tenant ini boleh melihat tanpa jadi anggota (§7.2).
  const previewingThis = preview?.tenantId === tenantId;
  const membership = await membershipSaya(user.id, tenantId);

  if (!previewingThis) {
    if (!membership) {
      // Platform owner sering buka tenant ini TANPA jadi anggota, lewat mode
      // Preview (§7.2). Begitu Preview di-exit (atau cookie-nya kedaluwarsa),
      // dia jatuh ke jalur ini juga — notFound() di sini dulu bikin 404
      // membingungkan buat platform owner sendiri, bukan cuma nyembunyikan
      // tenant dari orang asing. Anggota biasa yang bukan bagian tenant ini
      // tetap 404 seperti biasa.
      if (user.isPlatformOwner) {
        return (
          <Shell>
            Anda platform owner, tapi bukan anggota tenant ini. Mode Preview sudah berakhir.{" "}
            <Link href={`/admin/tenant/${tenantId}`} className="text-primary underline">
              Mulai Preview lagi
            </Link>{" "}
            untuk melihat tenant ini.
          </Shell>
        );
      }
      notFound();
    }
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
      // Baru dibaca di sini: tenant yang sudah approved (hampir semua request) tidak perlu bayar query ini.
      const approval = await prisma.tenantApprovalRequest.findUnique({ where: { tenantId } });
      return (
        <Shell>
          {approval?.status === "rejected"
            ? `Pendaftaran tenant ini ditolak Platform Owner.${approval.catatanOwner ? ` Catatan: ${approval.catatanOwner}` : ""}`
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
        createdAt: n.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE_WIB }),
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
        <Link href="/dashboard" className="mt-2 inline-block text-sm text-primary underline">
          Kembali ke Dashboard
        </Link>
      </Card>
    </main>
  );
}
