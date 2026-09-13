"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import { PREVIEW_COOKIE } from "@/lib/preview";

/** Profil pribadi (§7.13) — boleh diedit semua role, termasuk saat platform owner sedang preview. */
export async function updateAccountAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name) throw new Error("Nama wajib diisi");

  let image: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    image = await uploadImage(avatar, `guyub/avatar/${user.id}`);
  }

  await prisma.user.update({ where: { id: user.id }, data: { name, phone, ...(image ? { image } : {}) } });
  revalidatePath("/", "layout");
}

export async function markNotifReadAction() {
  const user = await requireUser();
  await prisma.notifikasi.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
}

export async function exitPreviewAction() {
  (await cookies()).delete(PREVIEW_COOKIE);
  revalidatePath("/", "layout");
}
