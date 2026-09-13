"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMembership, CAN_CATAT_KAS } from "@/lib/authz";
import type { KasTipe } from "@prisma/client";

export async function createKasTransaksiAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_CATAT_KAS);

  const tanggal = String(formData.get("tanggal"));
  const jumlah = String(formData.get("jumlah"));
  const tipe = String(formData.get("tipe"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!tanggal || !jumlah || (tipe !== "masuk" && tipe !== "keluar")) {
    throw new Error("Tanggal, jumlah, dan tipe wajib diisi");
  }

  await prisma.kasTransaksi.create({
    data: { tenantId, tanggal: new Date(tanggal), jumlah, tipe: tipe as KasTipe, keterangan, dicatatOlehId: user.id },
  });

  revalidatePath(`/t/${tenantId}/kas`);
}
