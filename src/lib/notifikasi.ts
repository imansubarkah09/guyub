import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { kirimPush } from "@/lib/push";

type Role = "pemilik" | "ketua" | "wakil_ketua" | "bendahara" | "sekretaris" | "anggota";

/**
 * Helper generik notifikasi (§7.12): event baru cukup panggil notify()/notifyTenant()/
 * notifyUsers(), tidak perlu tabel atau tipe baru per event. Ketiganya lewat simpan(),
 * jadi setiap notifikasi in-app otomatis ikut dikirim sebagai push ke HP.
 */
export async function notify(userId: string, tenantId: string | null, tipe: string, pesan: string, href?: string) {
  await simpan([userId], tenantId, tipe, pesan, href);
}

export async function notifyUsers(userIds: string[], tenantId: string | null, tipe: string, pesan: string, href?: string) {
  await simpan(userIds, tenantId, tipe, pesan, href);
}

/** Broadcast ke semua anggota aktif tenant, opsional hanya role tertentu. */
export async function notifyTenant(tenantId: string, tipe: string, pesan: string, opts: { href?: string; roles?: Role[]; kecuali?: string } = {}) {
  const members = await prisma.membership.findMany({
    where: { tenantId, status: "active", ...(opts.roles ? { roles: { hasSome: opts.roles } } : {}) },
    select: { userId: true },
  });
  await simpan(
    members.map((m) => m.userId).filter((id) => id !== opts.kecuali),
    tenantId,
    tipe,
    pesan,
    opts.href,
  );
}

async function simpan(userIds: string[], tenantId: string | null, tipe: string, pesan: string, href?: string) {
  if (userIds.length === 0) return;
  await prisma.notifikasi.createMany({ data: userIds.map((userId) => ({ userId, tenantId, tipe, pesan, href })) });
  // after(): push dikirim sesudah respons, jadi aksi pengguna tidak ikut menunggu
  // round-trip ke FCM/Apple untuk setiap HP penerima.
  after(async () => {
    const tenant = tenantId ? await prisma.tenantProfile.findUnique({ where: { tenantId }, select: { nama: true } }).catch(() => null) : null;
    await kirimPush(userIds, { judul: tenant?.nama ?? "Guyub", isi: pesan, url: href ?? (tenantId ? `/t/${tenantId}` : "/dashboard") });
  });
}
