"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { uploadImage } from "@/lib/upload";
import type { KasTipe } from "@prisma/client";

export async function createKasTransaksiAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const tanggal = String(formData.get("tanggal"));
  const jumlah = String(formData.get("jumlah"));
  const tipe = String(formData.get("tipe"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!tanggal || !jumlah || (tipe !== "masuk" && tipe !== "keluar")) {
    throw new Error("Tanggal, jumlah, dan tipe wajib diisi");
  }

  let buktiUrl: string | undefined;
  const bukti = formData.get("bukti");
  if (bukti instanceof File && bukti.size > 0) {
    buktiUrl = await uploadImage(bukti, `guyub/kas/${tenantId}`);
  }

  await prisma.kasTransaksi.create({
    data: { tenantId, tanggal: new Date(tanggal), jumlah, tipe: tipe as KasTipe, keterangan, buktiUrl, dicatatOlehId: user.id },
  });

  revalidatePath(`/t/${tenantId}/kas`);
}

/**
 * Bendahara bisa perbaiki transaksi yang sudah dicatat — jumlah salah ketik,
 * atau nambah bukti yang ketinggalan saat input pertama. Bukti lama dipakai
 * lagi kalau tidak ada file baru dilampirkan (bukan dihapus begitu saja).
 */
export async function updateKasTransaksiAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const id = String(formData.get("id"));
  const existing = await prisma.kasTransaksi.findUniqueOrThrow({ where: { id } });
  if (existing.tenantId !== tenantId) throw new Error("Transaksi tidak ditemukan di tenant ini");

  const tanggal = String(formData.get("tanggal"));
  const jumlah = String(formData.get("jumlah"));
  const tipe = String(formData.get("tipe"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!tanggal || !jumlah || (tipe !== "masuk" && tipe !== "keluar")) {
    throw new Error("Tanggal, jumlah, dan tipe wajib diisi");
  }

  let buktiUrl = existing.buktiUrl;
  const bukti = formData.get("bukti");
  if (bukti instanceof File && bukti.size > 0) {
    buktiUrl = await uploadImage(bukti, `guyub/kas/${tenantId}`);
  }

  await prisma.kasTransaksi.update({
    where: { id },
    data: { tanggal: new Date(tanggal), jumlah, tipe: tipe as KasTipe, keterangan, buktiUrl },
  });

  revalidatePath(`/t/${tenantId}/kas`);
}
