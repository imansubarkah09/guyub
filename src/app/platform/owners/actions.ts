"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";

export async function setPlatformOwnerAction(formData: FormData) {
  const user = await requireUser();
  requirePlatformOwner(user);

  const targetUserId = String(formData.get("userId"));
  const makeOwner = String(formData.get("makeOwner")) === "true";
  if (targetUserId === user.id) throw new Error("Tidak bisa mengubah status Platform Owner diri sendiri");

  await prisma.user.update({ where: { id: targetUserId }, data: { isPlatformOwner: makeOwner } });
  revalidatePath("/platform/owners");
}
