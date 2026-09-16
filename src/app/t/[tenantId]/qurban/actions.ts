"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, requireMemberWrite, CAN_CATAT_UANG } from "@/lib/authz";
import type { JenisHewan } from "@prisma/client";

const MAX_SLOT: Record<JenisHewan, number> = { sapi: 7, kambing: 1 };

export async function createQurbanGroupAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

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
  await requireMemberWrite(user, tenantId);

  const qurbanGroupId = String(formData.get("qurbanGroupId"));
  const group = await prisma.qurbanGroup.findUniqueOrThrow({ where: { id: qurbanGroupId }, include: { slots: true } });
  if (group.tenantId !== tenantId) throw new Error("Grup qurban tidak ditemukan di tenant ini");
  if (group.slots.length >= MAX_SLOT[group.jenisHewan]) throw new Error("Slot sudah penuh");

  await prisma.qurbanSlot.create({ data: { qurbanGroupId, userId: user.id } });
  revalidatePath(`/t/${tenantId}/qurban`);
}

/** Batal ikut slot: pemilik slot sendiri, atau bendahara mewakilkan. Hanya boleh selama belum ada setoran. */
export async function cancelQurbanSlotAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membership = await requireMemberWrite(user, tenantId);

  const slotId = String(formData.get("slotId"));
  const slot = await prisma.qurbanSlot.findUniqueOrThrow({ where: { id: slotId }, include: { qurbanGroup: true } });
  if (slot.qurbanGroup.tenantId !== tenantId) throw new Error("Slot tidak ditemukan di tenant ini");

  const isOwner = slot.userId === user.id;
  const isBendahara = membership.roles.some((r) => CAN_CATAT_UANG.includes(r));
  if (!isOwner && !isBendahara) throw new Error("Hanya pemilik slot atau bendahara yang bisa membatalkan");
  if (Number(slot.saldoTerkumpul) > 0) throw new Error("Sudah ada setoran, tidak bisa dibatalkan lagi");

  await prisma.qurbanSlot.delete({ where: { id: slotId } });
  await resyncQurbanGroupStatus(slot.qurbanGroupId);
  revalidatePath(`/t/${tenantId}/qurban`);
}

/** Recompute a slot's lunas flag and the group's overall status after any balance/target change. */
async function resyncQurbanGroupStatus(qurbanGroupId: string) {
  const group = await prisma.qurbanGroup.findUniqueOrThrow({ where: { id: qurbanGroupId }, include: { slots: true } });
  for (const s of group.slots) {
    const lunas = Number(s.saldoTerkumpul) >= Number(group.targetPerJiwa);
    if (lunas !== (s.status === "lunas")) {
      await prisma.qurbanSlot.update({ where: { id: s.id }, data: { status: lunas ? "lunas" : "belum" } });
    }
  }
  const allLunas = group.slots.length > 0 && group.slots.every((s) => Number(s.saldoTerkumpul) >= Number(group.targetPerJiwa));
  await prisma.qurbanGroup.update({ where: { id: qurbanGroupId }, data: { status: allLunas ? "lunas" : "terbuka" } });
}

/** Fix a typo in target/jenis after the group was already created. */
export async function updateQurbanGroupAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const qurbanGroupId = String(formData.get("qurbanGroupId"));
  const jenisHewan = String(formData.get("jenisHewan"));
  const targetPerJiwa = String(formData.get("targetPerJiwa"));
  if ((jenisHewan !== "sapi" && jenisHewan !== "kambing") || !targetPerJiwa) {
    throw new Error("Jenis hewan dan target per jiwa wajib diisi");
  }

  const group = await prisma.qurbanGroup.findUniqueOrThrow({ where: { id: qurbanGroupId }, include: { slots: true } });
  if (group.tenantId !== tenantId) throw new Error("Grup qurban tidak ditemukan di tenant ini");
  if (group.slots.length > MAX_SLOT[jenisHewan as JenisHewan]) {
    throw new Error(`Sudah ada ${group.slots.length} jiwa, tidak muat di jenis hewan ini`);
  }

  await prisma.qurbanGroup.update({ where: { id: qurbanGroupId }, data: { jenisHewan: jenisHewan as JenisHewan, targetPerJiwa } });
  await resyncQurbanGroupStatus(qurbanGroupId);
  revalidatePath(`/t/${tenantId}/qurban`);
}

/** Fix a mis-recorded setoran amount directly, instead of only adding more on top. */
export async function updateQurbanSlotAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const slotId = String(formData.get("slotId"));
  const saldoTerkumpul = String(formData.get("saldoTerkumpul"));
  if (saldoTerkumpul === "" || Number(saldoTerkumpul) < 0) throw new Error("Saldo terkumpul tidak valid");

  const slot = await prisma.qurbanSlot.findUniqueOrThrow({ where: { id: slotId }, include: { qurbanGroup: true } });
  if (slot.qurbanGroup.tenantId !== tenantId) throw new Error("Slot tidak ditemukan di tenant ini");

  await prisma.qurbanSlot.update({ where: { id: slotId }, data: { saldoTerkumpul } });
  await resyncQurbanGroupStatus(slot.qurbanGroupId);
  revalidatePath(`/t/${tenantId}/qurban`);
}

export async function setorQurbanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const slotId = String(formData.get("slotId"));
  const jumlah = Number(formData.get("jumlah"));
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");

  const slot = await prisma.qurbanSlot.findUniqueOrThrow({ where: { id: slotId }, include: { qurbanGroup: true } });
  if (slot.qurbanGroup.tenantId !== tenantId) throw new Error("Slot tidak ditemukan di tenant ini");

  const saldoTerkumpul = Number(slot.saldoTerkumpul) + jumlah;
  await prisma.qurbanSlot.update({ where: { id: slotId }, data: { saldoTerkumpul } });
  await resyncQurbanGroupStatus(slot.qurbanGroupId);

  revalidatePath(`/t/${tenantId}/qurban`);
}
