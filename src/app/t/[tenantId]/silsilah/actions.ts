"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMembership, CAN_KELOLA_ANGGOTA } from "@/lib/authz";

export async function addFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_ANGGOTA);

  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) throw new Error("Nama wajib diisi");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const spouseId = String(formData.get("spouseId") ?? "") || null;
  const userId = String(formData.get("userId") ?? "") || null;

  await prisma.familyNode.create({ data: { tenantId, nama, parentId, spouseId, userId } });
  revalidatePath(`/t/${tenantId}/silsilah`);
}
