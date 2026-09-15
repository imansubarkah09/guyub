"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { uploadImage } from "@/lib/upload";
import { validasiFileGambar } from "@/lib/validasi-file";
import type { KasTipe } from "@prisma/client";

export type KasActionState = { error: string } | null;

/**
 * Root cause React error #441 di form Kas (ketemu review 15 Sep 2026, kejadian
 * kedua setelah fix CLOUDINARY_URL commit 8995e25): upload Cloudinary & write
 * Prisma dulu bisa `throw` mentah, dan Next.js SELALU meredaksi pesan asli jadi
 * digest generik di production, apa pun sebab error-nya (bukan cuma masalah
 * config yang kemarin). Jalan keluarnya bukan menghindari semua error, tapi
 * tidak pernah throw ke boundary React: tangkap di sini, log detail aslinya
 * (kebaca lewat `wrangler tail`/Workers Logs), balikin pesan jelas ke form.
 */
async function unggahBuktiJikaAda(bukti: FormDataEntryValue | null, tenantId: string): Promise<{ url?: string; error?: string }> {
  if (!(bukti instanceof File) || bukti.size === 0) return {};
  const pesanValidasi = validasiFileGambar(bukti);
  if (pesanValidasi) return { error: pesanValidasi };
  try {
    return { url: await uploadImage(bukti, `guyub/kas/${tenantId}`) };
  } catch (e) {
    console.error("Upload bukti transfer kas gagal", e);
    return { error: "Gagal mengunggah bukti transfer. Coba lagi atau pakai file lain." };
  }
}

export async function createKasTransaksiAction(_prevState: KasActionState, formData: FormData): Promise<KasActionState> {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const tanggal = String(formData.get("tanggal"));
  const jumlah = String(formData.get("jumlah"));
  const tipe = String(formData.get("tipe"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!tanggal || !jumlah || (tipe !== "masuk" && tipe !== "keluar")) {
    return { error: "Tanggal, jumlah, dan tipe wajib diisi" };
  }

  const bukti = await unggahBuktiJikaAda(formData.get("bukti"), tenantId);
  if (bukti.error) return { error: bukti.error };

  try {
    await prisma.kasTransaksi.create({
      data: { tenantId, tanggal: new Date(tanggal), jumlah, tipe: tipe as KasTipe, keterangan, buktiUrl: bukti.url, dicatatOlehId: user.id },
    });
  } catch (e) {
    console.error("Simpan transaksi kas gagal", e);
    return { error: "Gagal menyimpan transaksi. Coba lagi." };
  }

  revalidatePath(`/t/${tenantId}/kas`);
  return null;
}

/**
 * Bendahara bisa perbaiki transaksi yang sudah dicatat — jumlah salah ketik,
 * atau nambah bukti yang ketinggalan saat input pertama. Bukti lama dipakai
 * lagi kalau tidak ada file baru dilampirkan (bukan dihapus begitu saja).
 */
export async function updateKasTransaksiAction(formData: FormData): Promise<KasActionState> {
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
    return { error: "Tanggal, jumlah, dan tipe wajib diisi" };
  }

  const bukti = await unggahBuktiJikaAda(formData.get("bukti"), tenantId);
  if (bukti.error) return { error: bukti.error };

  try {
    await prisma.kasTransaksi.update({
      where: { id },
      data: { tanggal: new Date(tanggal), jumlah, tipe: tipe as KasTipe, keterangan, buktiUrl: bukti.url ?? existing.buktiUrl },
    });
  } catch (e) {
    console.error("Simpan transaksi kas gagal", e);
    return { error: "Gagal menyimpan transaksi. Coba lagi." };
  }

  revalidatePath(`/t/${tenantId}/kas`);
  return null;
}
