"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_BUAT_LAPORAN } from "@/lib/authz";
import { angkaTenant } from "@/lib/ringkasan";
import { uploadToCloudinary } from "@/lib/cloudinary";

export type LaporanActionResult = { error: string } | { shareLink: string };

/**
 * Publikasikan laporan. Yang disimpan untuk halaman publik HANYA dua angka agregat
 * (totalMasuk/totalKeluar), bukan daftar transaksi atau nama anggota (§7.11/§9).
 *
 * Upload Cloudinary dan write Prisma dibungkus try/catch (pola yang sama dengan
 * fix React error #441 di kas/actions.ts): kalau throw mentah, Next.js meredaksi
 * pesan aslinya jadi digest generik di production, jadi user cuma lihat kode
 * minified alih-alih pesan yang jelas.
 */
export async function createLaporanAction(tenantId: string, periode: string, pdfDataUri: string | null): Promise<LaporanActionResult> {
  const user = await requireUser();
  await requireWrite(user, tenantId, CAN_BUAT_LAPORAN);
  if (!periode.trim()) return { error: "Periode wajib diisi" };

  const r = await angkaTenant(tenantId);
  const totalMasuk = r.kasMasuk + r.saldoInfaq + r.qurbanTotal;
  const totalKeluar = r.kasKeluar;

  let pdfUrl: string | undefined;
  if (pdfDataUri) {
    try {
      const uploaded = await uploadToCloudinary(pdfDataUri, { folder: `guyub/laporan/${tenantId}`, resourceType: "auto" });
      pdfUrl = uploaded.secure_url;
    } catch (e) {
      console.error("Upload PDF laporan gagal", e);
      return { error: "Gagal mengunggah PDF laporan. Coba lagi." };
    }
  }

  try {
    const laporan = await prisma.laporan.create({
      data: { tenantId, periode: periode.trim(), pdfUrl, totalMasuk, totalKeluar },
    });
    revalidatePath(`/t/${tenantId}/laporan`);
    return { shareLink: laporan.shareLink };
  } catch (e) {
    console.error("Simpan laporan gagal", e);
    return { error: "Gagal menyimpan laporan. Coba lagi." };
  }
}
