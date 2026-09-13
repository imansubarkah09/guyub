"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { tambahNyawa, tarikDonasi } from "@/lib/trakteer";

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

/**
 * Tarik donasi langsung dari API Trakteer. Webhook bisa gagal/terlewat, dan
 * tombol ini yang jadi jaring pengamannya — aman diklik berulang karena
 * catatDonasi() idempoten lewat orderId.
 */
export async function tarikDonasiAction() {
  const user = await requireUser();
  requirePlatformOwner(user);

  const hasil = await tarikDonasi();
  revalidatePath("/admin/trakteer");
  if (hasil.error) throw new Error(`Gagal menarik dari Trakteer: ${hasil.error}`);
}
