"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { uploadImage } from "@/lib/upload";
import { saldoPool } from "@/lib/dana";
import type { SumberDana } from "@prisma/client";

/** "kas" | "infaq" | "donasi" | "tabungan:<id>" → bentuk yang dipakai DB. */
function uraikanSumber(raw: string) {
  if (raw.startsWith("tabungan:")) return { sumberDana: "tabungan" as SumberDana, sumberTabunganTipeId: raw.slice(9) };
  return { sumberDana: raw as SumberDana, sumberTabunganTipeId: null };
}

export async function catatKegiatanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const namaKegiatan = String(formData.get("namaKegiatan") ?? "").trim();
  const tanggalStr = String(formData.get("tanggal"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  const targetRaw = String(formData.get("targetDana") ?? "").trim();
  if (!namaKegiatan) throw new Error("Nama kegiatan wajib diisi");
  if (!tanggalStr) throw new Error("Tanggal wajib diisi");

  // Baris sumber dikirim berpasangan: sumber[] dan jumlahSumber[].
  const sumberRaw = formData.getAll("sumber").map(String);
  const jumlahRaw = formData.getAll("jumlahSumber").map((v) => Number(v));
  const baris = sumberRaw
    .map((s, i) => ({ raw: s, jumlah: jumlahRaw[i] ?? 0 }))
    .filter((b) => b.raw && b.jumlah > 0);
  if (baris.length === 0) throw new Error("Isi minimal satu sumber dana dengan jumlah lebih dari 0");

  // Validasi per pool: total yang diambil dari SATU pool tidak boleh melebihi saldonya.
  const perPool = new Map<string, number>();
  for (const b of baris) perPool.set(b.raw, (perPool.get(b.raw) ?? 0) + b.jumlah);
  for (const [raw, jumlah] of perPool) {
    if (raw === "donasi") continue; // donasi dikumpulkan terpisah, bukan ambil dari pool
    const { sumberDana, sumberTabunganTipeId } = uraikanSumber(raw);
    const tersedia = await saldoPool(tenantId, sumberDana, sumberTabunganTipeId);
    if (jumlah > tersedia) {
      throw new Error(`Jumlah dari ${raw === "kas" ? "Kas" : raw === "infaq" ? "Infaq & Shodaqoh" : "tabungan"} melebihi saldo (tersedia Rp${tersedia.toLocaleString("id-ID")})`);
    }
  }

  let buktiUrl: string | undefined;
  const bukti = formData.get("bukti");
  if (bukti instanceof File && bukti.size > 0) buktiUrl = await uploadImage(bukti, `guyub/kegiatan/${tenantId}`);

  await prisma.danaKegiatan.create({
    data: {
      tenantId,
      namaKegiatan,
      targetDana: targetRaw ? targetRaw : null,
      tanggal: new Date(tanggalStr),
      keterangan,
      buktiUrl,
      dicatatOlehId: user.id,
      sumber: { create: baris.map((b) => ({ ...uraikanSumber(b.raw), jumlah: b.jumlah })) },
    },
  });

  // Pool tabungan dikurangi fisik; kas & infaq saldonya dihitung turunan di lib/ringkasan.ts.
  for (const b of baris) {
    const { sumberDana, sumberTabunganTipeId } = uraikanSumber(b.raw);
    if (sumberDana === "tabungan" && sumberTabunganTipeId) {
      const pooled = await prisma.tabunganSaldo.findFirst({ where: { tabunganTipeId: sumberTabunganTipeId, userId: null } });
      if (pooled) await prisma.tabunganSaldo.update({ where: { id: pooled.id }, data: { jumlah: { decrement: b.jumlah } } });
    }
  }

  revalidatePath(`/t/${tenantId}/kegiatan`);
  revalidatePath(`/t/${tenantId}`);
}

/** Pemasukan donasi terbuka untuk satu kegiatan (§ permintaan: 1,4 juta open donasi). */
export async function catatDonasiAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const kegiatanId = String(formData.get("kegiatanId"));
  const namaDonatur = String(formData.get("namaDonatur") ?? "").trim();
  const jumlah = Number(formData.get("jumlah"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!namaDonatur) throw new Error("Nama donatur wajib diisi");
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah donasi wajib lebih dari 0");

  const kegiatan = await prisma.danaKegiatan.findUniqueOrThrow({ where: { id: kegiatanId } });
  if (kegiatan.tenantId !== tenantId) throw new Error("Kegiatan tidak ditemukan di tenant ini");

  await prisma.danaKegiatanDonasi.create({ data: { kegiatanId, namaDonatur, jumlah, keterangan } });
  revalidatePath(`/t/${tenantId}/kegiatan`);
}
