"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_BUAT_LAPORAN } from "@/lib/authz";
import { angkaTenant } from "@/lib/ringkasan";
import { cloudinary } from "@/lib/cloudinary";

/**
 * Publikasikan laporan. Yang disimpan untuk halaman publik HANYA dua angka agregat
 * (totalMasuk/totalKeluar) — bukan daftar transaksi atau nama anggota (§7.11/§9).
 */
export async function createLaporanAction(tenantId: string, periode: string, pdfDataUri: string | null) {
  const user = await requireUser();
  await requireWrite(user, tenantId, CAN_BUAT_LAPORAN);
  if (!periode.trim()) throw new Error("Periode wajib diisi");

  const r = await angkaTenant(tenantId);
  const totalMasuk = r.kasMasuk + r.saldoInfaq + r.qurbanTotal;
  const totalKeluar = r.kasKeluar;

  let pdfUrl: string | undefined;
  if (pdfDataUri) {
    const uploaded = await cloudinary.uploader.upload(pdfDataUri, { folder: `guyub/laporan/${tenantId}`, resource_type: "auto" });
    pdfUrl = uploaded.secure_url;
  }

  const laporan = await prisma.laporan.create({
    data: { tenantId, periode: periode.trim(), pdfUrl, totalMasuk, totalKeluar },
  });

  revalidatePath(`/t/${tenantId}/laporan`);
  return laporan.shareLink;
}
