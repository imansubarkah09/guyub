import { prisma } from "@/lib/prisma";
import type { TabunganMode } from "@prisma/client";

export async function creditSaldo(tabunganTipeId: string, mode: TabunganMode, targetUserId: string | null, jumlah: number) {
  if (mode === "pooled") {
    const existing = await prisma.tabunganSaldo.findFirst({ where: { tabunganTipeId, userId: null } });
    if (existing) {
      await prisma.tabunganSaldo.update({ where: { id: existing.id }, data: { jumlah: { increment: jumlah } } });
    } else {
      await prisma.tabunganSaldo.create({ data: { tabunganTipeId, userId: null, jumlah } });
    }
  } else {
    if (!targetUserId) throw new Error("Anggota tujuan wajib diisi untuk tabungan individual");
    await prisma.tabunganSaldo.upsert({
      where: { tabunganTipeId_userId: { tabunganTipeId, userId: targetUserId } },
      update: { jumlah: { increment: jumlah } },
      create: { tabunganTipeId, userId: targetUserId, jumlah },
    });
  }
}
