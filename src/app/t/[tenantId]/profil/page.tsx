import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_UPDATE_PROFIL, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import { ProfilForm } from "./profil-form";

/**
 * Root cause React error #441 (ketemu review 15 Sep 2026): halaman ini baca
 * Membership platform owner sendiri lewat `findUniqueOrThrow`, padahal saat
 * mode Preview (§7.2) platform owner sengaja TIDAK punya baris Membership di
 * tenant yang di-preview (lihat layout.tsx) — jadi query itu selalu P2025 dan
 * meledak jadi digest generik di production. Halaman lain sudah pakai
 * effectiveRoles() yang menangani preview dengan benar, cuma halaman ini yang
 * ketinggalan (masih pola lama dari Fase 1).
 */
export default async function ProfilPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [{ roles }, profile] = await Promise.all([
    effectiveRoles(user, tenantId),
    prisma.tenantProfile.findUniqueOrThrow({ where: { tenantId } }),
  ]);

  if (!has(roles, CAN_UPDATE_PROFIL)) {
    return (
      <div className="space-y-2 text-sm">
        {profile.logoUrl && <img src={profile.logoUrl} alt="" className="h-16 w-16 rounded-md object-cover" />}
        <p className="font-medium">{profile.nama}</p>
        {profile.alamat && <p className="text-foreground/60">{profile.alamat}</p>}
      </div>
    );
  }

  return <ProfilForm tenantId={tenantId} profile={profile} />;
}
