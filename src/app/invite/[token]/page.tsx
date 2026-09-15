import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notifyTenant } from "@/lib/notifikasi";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Card } from "@/components/ui";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { tenant: { include: { profile: true } } },
  });

  if (!invitation || invitation.status !== "active") {
    return (
      <Shell>
        {/* Pola sama dengan TenantError (t/[tenantId]/error.tsx): Card tone-tinted
            + ikon, bukan teks hitam polos (§colorize, 15 Sep 2026). */}
        <Card className="border-danger/30 bg-danger/5">
          <p className="flex items-center justify-center gap-2 font-medium text-danger">
            <AlertTriangle className="h-5 w-5" /> Link tidak valid
          </p>
          <p className="mt-2 text-sm text-muted">Link undangan tidak valid atau sudah dicabut. Minta link baru ke pengurus.</p>
        </Card>
      </Shell>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      // Bukan status error/sukses/pending, jadi tidak dikasih tone — tapi tetap
      // dibungkus Card supaya sejajar bobot visualnya dengan 3 state lain di
      // halaman ini, bukan satu-satunya yang polos (polish, 15 Sep 2026).
      <Shell>
        <Card>
          <p className="mb-4 text-sm">
            Anda diundang bergabung ke <strong>{invitation.tenant.profile?.nama}</strong>.
          </p>
          <GoogleSignInButton callbackURL={`/invite/${token}`} label="Masuk dengan Google untuk bergabung" />
        </Card>
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
        <Card className="border-success/30 bg-success/5">
          <p className="flex items-center justify-center gap-2 font-medium text-success">
            <CheckCircle2 className="h-5 w-5" /> Berhasil bergabung
          </p>
          <p className="mt-2 text-sm text-muted">
            Anda sudah jadi anggota <strong>{invitation.tenant.profile?.nama}</strong>.{" "}
            <Link href={`/t/${invitation.tenantId}`} className="text-primary underline">
              Buka tenant
            </Link>
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="border-warning/30 bg-warning/5">
        <p className="flex items-center justify-center gap-2 font-medium text-warning">
          <Clock className="h-5 w-5" /> Menunggu konfirmasi
        </p>
        <p className="mt-2 text-sm text-muted">
          Permintaan bergabung ke <strong>{invitation.tenant.profile?.nama}</strong> terkirim. Menunggu konfirmasi pengurus.
        </p>
      </Card>
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
