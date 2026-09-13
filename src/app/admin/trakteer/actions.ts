"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { tambahNyawa } from "@/lib/trakteer";

/**
 * Donasi yang kode tenantnya tidak terbaca dari pesan Trakteer ditautkan manual
 * di sini. Nyawa baru ditambahkan saat penautan, sekali saja.
 */
export async function tautkanDonasiAction(formData: FormData) {
  const user = await requireUser();
  requirePlatformOwner(user);

  const donasiId = String(formData.get("donasiId"));
  const tenantId = String(formData.get("tenantId"));
  if (!tenantId) throw new Error("Pilih tenant tujuan");

  const donasi = await prisma.trakteerDonasi.findUniqueOrThrow({ where: { id: donasiId } });
  if (donasi.tenantId) throw new Error("Donasi ini sudah tertaut ke sebuah tenant");

  await prisma.trakteerDonasi.update({ where: { id: donasiId }, data: { tenantId } });
  await tambahNyawa(tenantId, donasi.hariNyawa);

  revalidatePath("/admin/trakteer");
}
