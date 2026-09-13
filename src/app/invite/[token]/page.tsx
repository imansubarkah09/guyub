import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notifyTenant } from "@/lib/notifikasi";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { tenant: { include: { profile: true } } },
  });

  if (!invitation || invitation.status !== "active") {
    return <Shell>Link undangan tidak valid atau sudah dicabut. Minta link baru ke pengurus.</Shell>;
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      <Shell>
        <p className="mb-4">Anda diundang bergabung ke <strong>{invitation.tenant.profile?.nama}</strong>.</p>
        <GoogleSignInButton callbackURL={`/invite/${token}`} label="Masuk dengan Google untuk bergabung" />
      </Shell>
    );
  }

  let membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: invitation.tenantId } },
  });

  if (!membership) {
    membership = await prisma.membership.create({
      data: { userId: user.id, tenantId: invitation.tenantId, roles: ["anggota"], status: "pending_confirmation" },
    });
    await notifyTenant(invitation.tenantId, "anggota_menunggu", `${user.name} mendaftar dan menunggu persetujuan`, {
      href: `/t/${invitation.tenantId}/anggota`,
      roles: ["ketua", "sekretaris"],
    });
  }

  if (membership.status === "active") {
    return (
      <Shell>
        Anda sudah jadi anggota <strong>{invitation.tenant.profile?.nama}</strong>.{" "}
        <Link href={`/t/${invitation.tenantId}`} className="text-primary underline">
          Buka tenant
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      Permintaan bergabung ke <strong>{invitation.tenant.profile?.nama}</strong> terkirim. Menunggu konfirmasi pengurus.
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center text-sm">
      <div className="max-w-sm">{children}</div>
    </main>
  );
}
