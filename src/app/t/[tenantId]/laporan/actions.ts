"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMembership, CAN_CONFIRM_ANGGOTA } from "@/lib/authz";
import { cloudinary } from "@/lib/cloudinary";

export async function createLaporanAction(tenantId: string, periode: string, pdfDataUri: string) {
  const user = await requireUser();
  await requireMembership(user.id, tenantId, CAN_CONFIRM_ANGGOTA);
  if (!periode.trim()) throw new Error("Periode wajib diisi");

  const uploaded = await cloudinary.uploader.upload(pdfDataUri, { folder: `guyub/laporan/${tenantId}`, resource_type: "auto" });

  await prisma.laporan.create({ data: { tenantId, periode: periode.trim(), pdfUrl: uploaded.secure_url } });
  revalidatePath(`/t/${tenantId}/laporan`);
}
