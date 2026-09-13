"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_CATAT_UANG } from "@/lib/authz";

export async function catatInfaqAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const tanggalPertemuan = String(formData.get("tanggalPertemuan"));
  const jumlah = Number(formData.get("jumlah"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!tanggalPertemuan) throw new Error("Tanggal pertemuan wajib diisi");
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah wajib lebih dari 0");

  await prisma.infaqShodaqoh.create({
    data: { tenantId, tanggalPertemuan: new Date(tanggalPertemuan), jumlah, keterangan, dicatatOlehId: user.id },
  });
  revalidatePath(`/t/${tenantId}/infaq`);
}

export async function hapusInfaqAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const id = String(formData.get("id"));
  const row = await prisma.infaqShodaqoh.findUniqueOrThrow({ where: { id } });
  if (row.tenantId !== tenantId) throw new Error("Data tidak ditemukan di tenant ini");

  await prisma.infaqShodaqoh.delete({ where: { id } });
  revalidatePath(`/t/${tenantId}/infaq`);
}
