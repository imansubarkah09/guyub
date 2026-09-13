"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMembership, CAN_KELOLA_TABUNGAN } from "@/lib/authz";
import type { JenisHewan } from "@prisma/client";

const MAX_SLOT: Record<JenisHewan, number> = { sapi: 7, kambing: 1 };

export async function createQurbanGroupAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_TABUNGAN);

  const jenisHewan = String(formData.get("jenisHewan"));
  const targetPerJiwa = String(formData.get("targetPerJiwa"));
  if ((jenisHewan !== "sapi" && jenisHewan !== "kambing") || !targetPerJiwa) {
    throw new Error("Jenis hewan dan target per jiwa wajib diisi");
  }

  await prisma.qurbanGroup.create({ data: { tenantId, jenisHewan: jenisHewan as JenisHewan, targetPerJiwa } });
  revalidatePath(`/t/${tenantId}/qurban`);
}

export async function joinQurbanSlotAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId);

  const qurbanGroupId = String(formData.get("qurbanGroupId"));
  const group = await prisma.qurbanGroup.findUniqueOrThrow({ where: { id: qurbanGroupId }, include: { slots: true } });
  if (group.tenantId !== tenantId) throw new Error("Grup qurban tidak ditemukan di tenant ini");
  if (group.slots.length >= MAX_SLOT[group.jenisHewan]) throw new Error("Slot sudah penuh");

  await prisma.qurbanSlot.create({ data: { qurbanGroupId, userId: user.id } });
  revalidatePath(`/t/${tenantId}/qurban`);
}

export async function setorQurbanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_TABUNGAN);

  const slotId = String(formData.get("slotId"));
  const jumlah = Number(formData.get("jumlah"));
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");

  const slot = await prisma.qurbanSlot.findUniqueOrThrow({ where: { id: slotId }, include: { qurbanGroup: true } });
  if (slot.qurbanGroup.tenantId !== tenantId) throw new Error("Slot tidak ditemukan di tenant ini");

  const saldoTerkumpul = Number(slot.saldoTerkumpul) + jumlah;
  const lunas = saldoTerkumpul >= Number(slot.qurbanGroup.targetPerJiwa);
  await prisma.qurbanSlot.update({ where: { id: slotId }, data: { saldoTerkumpul, status: lunas ? "lunas" : "belum" } });

  const allSlots = await prisma.qurbanSlot.findMany({ where: { qurbanGroupId: slot.qurbanGroupId } });
  if (allSlots.every((s) => s.status === "lunas")) {
    await prisma.qurbanGroup.update({ where: { id: slot.qurbanGroupId }, data: { status: "lunas" } });
  }

  revalidatePath(`/t/${tenantId}/qurban`);
}
