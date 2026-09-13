"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_KELOLA_ANGGOTA } from "@/lib/authz";

export async function addFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) throw new Error("Nama wajib diisi");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const spouseId = String(formData.get("spouseId") ?? "") || null;
  const userId = String(formData.get("userId") ?? "") || null;

  await prisma.familyNode.create({ data: { tenantId, nama, parentId, spouseId, userId } });
  revalidatePath(`/t/${tenantId}/silsilah`);
}

export async function updateFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const nodeId = String(formData.get("nodeId"));
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) throw new Error("Nama wajib diisi");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const spouseId = String(formData.get("spouseId") ?? "") || null;
  if (parentId === nodeId) throw new Error("Tidak bisa jadi orang tua sendiri");
  if (spouseId === nodeId) throw new Error("Tidak bisa jadi pasangan sendiri");

  const node = await prisma.familyNode.findUniqueOrThrow({ where: { id: nodeId } });
  if (node.tenantId !== tenantId) throw new Error("Data silsilah tidak ditemukan di tenant ini");

  await prisma.familyNode.update({ where: { id: nodeId }, data: { nama, parentId, spouseId } });
  revalidatePath(`/t/${tenantId}/silsilah`);
}
