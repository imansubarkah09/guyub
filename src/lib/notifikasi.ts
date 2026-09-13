import { prisma } from "@/lib/prisma";

/**
 * Helper generik notifikasi (§7.12) — event baru cukup panggil notify()/notifyTenant(),
 * tidak perlu tabel atau tipe baru per event.
 */
export async function notify(userId: string, tenantId: string | null, tipe: string, pesan: string, href?: string) {
  await prisma.notifikasi.create({ data: { userId, tenantId, tipe, pesan, href } });
}

/** Broadcast ke semua anggota aktif tenant, opsional hanya role tertentu. */
export async function notifyTenant(
  tenantId: string,
  tipe: string,
  pesan: string,
  opts: { href?: string; roles?: ("ketua" | "bendahara" | "sekretaris" | "anggota")[]; kecuali?: string } = {},
) {
  const members = await prisma.membership.findMany({
    where: { tenantId, status: "active", ...(opts.roles ? { roles: { hasSome: opts.roles } } : {}) },
    select: { userId: true },
  });
  const target = members.map((m) => m.userId).filter((id) => id !== opts.kecuali);
  if (target.length === 0) return;
  await prisma.notifikasi.createMany({
    data: target.map((userId) => ({ userId, tenantId, tipe, pesan, href: opts.href })),
  });
}
