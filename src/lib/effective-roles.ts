import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getPreview } from "@/lib/preview";
import type { Role } from "@prisma/client";

/**
 * Satu baris Membership dibaca berkali-kali dalam satu request: layout tenant
 * memakainya untuk gerbang akses, lalu tiap halaman memakainya lagi lewat
 * effectiveRoles(). cache() React menyatukan pembacaan itu jadi satu query per
 * request — tanpa ini, tiap halaman tenant menembakkan 2 sampai 3 SELECT
 * Membership yang isinya persis sama.
 */
export const membershipSaya = cache((userId: string, tenantId: string) =>
  prisma.membership.findUnique({ where: { userId_tenantId: { userId, tenantId } } }),
);

/**
 * Role yang dipakai untuk MENAMPILKAN UI. Saat platform owner sedang preview,
 * role-nya diambil dari target preview dan `readOnly` true — server tetap menolak
 * tulisnya lewat requireWrite(), ini hanya supaya tombolnya ikut disembunyikan.
 */
export async function effectiveRoles(
  user: { id: string; isPlatformOwner: boolean },
  tenantId: string,
): Promise<{ roles: Role[]; readOnly: boolean }> {
  const preview = await getPreview(user);
  if (preview?.tenantId === tenantId) {
    if (preview.userId) {
      const target = await membershipSaya(preview.userId, tenantId);
      return { roles: target?.roles ?? ["anggota"], readOnly: true };
    }
    return { roles: preview.role ? [preview.role] : ["anggota"], readOnly: true };
  }
  const membership = await membershipSaya(user.id, tenantId);
  return { roles: membership?.roles ?? [], readOnly: false };
}

/** userId yang "dilihat" — saat Preview as User, data personal yang ditampilkan adalah milik user itu (§7.2). */
export async function viewerUserId(user: { id: string; isPlatformOwner: boolean }, tenantId: string) {
  const preview = await getPreview(user);
  if (preview?.tenantId === tenantId && preview.userId) return preview.userId;
  return user.id;
}
