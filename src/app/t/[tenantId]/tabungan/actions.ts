"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMembership, CAN_KELOLA_TABUNGAN } from "@/lib/authz";
import type { TabunganMode } from "@prisma/client";

export async function createTabunganTipeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_TABUNGAN);

  const nama = String(formData.get("nama") ?? "").trim();
  const mode = String(formData.get("mode"));
  if (!nama || (mode !== "individual" && mode !== "pooled")) throw new Error("Nama dan mode wajib diisi");

  await prisma.tabunganTipe.create({ data: { tenantId, nama, mode: mode as TabunganMode } });
  revalidatePath(`/t/${tenantId}/tabungan`);
}

export async function setorAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_TABUNGAN);

  const tabunganTipeId = String(formData.get("tabunganTipeId"));
  const jumlah = Number(formData.get("jumlah"));
  const targetUserId = String(formData.get("userId") ?? "") || null;
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");

  const tipe = await prisma.tabunganTipe.findUniqueOrThrow({ where: { id: tabunganTipeId } });
  if (tipe.tenantId !== tenantId) throw new Error("Tipe tabungan tidak ditemukan di tenant ini");

  if (tipe.mode === "pooled") {
    const existing = await prisma.tabunganSaldo.findFirst({ where: { tabunganTipeId, userId: null } });
    if (existing) {
      await prisma.tabunganSaldo.update({ where: { id: existing.id }, data: { jumlah: { increment: jumlah } } });
    } else {
      await prisma.tabunganSaldo.create({ data: { tabunganTipeId, userId: null, jumlah } });
    }
  } else {
    if (!targetUserId) throw new Error("Pilih anggota untuk tabungan individual");
    await prisma.tabunganSaldo.upsert({
      where: { tabunganTipeId_userId: { tabunganTipeId, userId: targetUserId } },
      update: { jumlah: { increment: jumlah } },
      create: { tabunganTipeId, userId: targetUserId, jumlah },
    });
  }

  revalidatePath(`/t/${tenantId}/tabungan`);
}
