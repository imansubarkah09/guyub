import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertNotPreview } from "@/lib/preview";
import type { Role } from "@prisma/client";

/**
 * Matriks izin — docs/tasks/2026-09-revamp-uiux-dan-fitur.md §5.
 * Satu orang bisa punya >1 role; izin = OR dari semua role yang dimiliki.
 * Catatan: uang HANYA bendahara (ketua pun tidak boleh mencatat transaksi).
 */
export const PENGURUS: Role[] = ["ketua", "bendahara", "sekretaris"];
/** Kas, tabungan, qurban, infaq, dana kegiatan, tandai bayar arisan. */
export const CAN_CATAT_UANG: Role[] = ["bendahara"];
/** Jadwal & urutan giliran arisan. */
export const CAN_ATUR_ARISAN: Role[] = ["ketua", "bendahara", "sekretaris"];
/** Undangan, approve anggota, ubah role, edit silsilah orang lain. */
export const CAN_KELOLA_ANGGOTA: Role[] = ["ketua", "sekretaris"];
/** Generate laporan & export. */
export const CAN_BUAT_LAPORAN: Role[] = ["ketua", "bendahara", "sekretaris"];
/** Profil tenant (nama/alamat/logo) — hanya ketua. */
export const CAN_UPDATE_PROFIL: Role[] = ["ketua"];

/** Throws (404, bukan 403, supaya tidak membocorkan keberadaan tenant) kalau bukan anggota aktif. */
export async function requireMembership(userId: string, tenantId: string, allowedRoles?: Role[]) {
  const membership = await prisma.membership.findUnique({ where: { userId_tenantId: { userId, tenantId } } });
  if (!membership || membership.status !== "active") notFound();
  if (allowedRoles && !membership.roles.some((r) => allowedRoles.includes(r))) {
    throw new Error("Tidak punya izin untuk aksi ini");
  }
  return membership;
}

/**
 * Choke point untuk SEMUA aksi tulis di dalam tenant: cek role + tolak mode preview.
 * Jalur tulis baru wajib lewat sini, bukan requireMembership langsung.
 */
export async function requireWrite(
  user: { id: string; isPlatformOwner: boolean },
  tenantId: string,
  allowedRoles: Role[],
) {
  await assertNotPreview(user);
  return requireMembership(user.id, tenantId, allowedRoles);
}

/** Aksi tulis yang memang boleh dilakukan anggota biasa (join slot qurban, ajukan setoran sendiri) — tetap ditolak di mode preview. */
export async function requireMemberWrite(user: { id: string; isPlatformOwner: boolean }, tenantId: string) {
  await assertNotPreview(user);
  return requireMembership(user.id, tenantId);
}

export function requirePlatformOwner(user: { isPlatformOwner: boolean }) {
  if (!user.isPlatformOwner) notFound();
}

export function has(roles: Role[], allowed: Role[]) {
  return roles.some((r) => allowed.includes(r));
}
