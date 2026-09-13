import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/** Permission matrix, spec §4.2 — pengurus roles that can act on shared tenant data. */
export const PENGURUS: Role[] = ["ketua", "bendahara", "sekretaris"];
export const CAN_CATAT_KAS: Role[] = ["ketua", "bendahara"];
export const CAN_KELOLA_TABUNGAN: Role[] = ["ketua", "bendahara"];
export const CAN_KELOLA_ANGGOTA: Role[] = ["ketua", "sekretaris"];
export const CAN_UPDATE_PROFIL: Role[] = ["ketua", "sekretaris"];
export const CAN_CONFIRM_ANGGOTA: Role[] = ["ketua", "bendahara", "sekretaris"];

/** Throws (404, not a permission leak) if the user isn't an active member; optionally requires specific roles. */
export async function requireMembership(userId: string, tenantId: string, allowedRoles?: Role[]) {
  const membership = await prisma.membership.findUnique({ where: { userId_tenantId: { userId, tenantId } } });
  if (!membership || membership.status !== "active") notFound();
  if (allowedRoles && !membership.roles.some((r) => allowedRoles.includes(r))) {
    throw new Error("Tidak punya izin untuk aksi ini");
  }
  return membership;
}

export function requirePlatformOwner(user: { isPlatformOwner: boolean }) {
  if (!user.isPlatformOwner) notFound();
}
