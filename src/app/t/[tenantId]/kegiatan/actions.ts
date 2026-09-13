"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { uploadImage } from "@/lib/upload";
import { saldoPool } from "@/lib/dana";
import type { SumberDana } from "@prisma/client";

export async function catatKegiatanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const namaKegiatan = String(formData.get("namaKegiatan") ?? "").trim();
  const sumberRaw = String(formData.get("sumberDana"));
  const jumlah = Number(formData.get("jumlah"));
  const tanggalStr = String(formData.get("tanggal"));
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!namaKegiatan) throw new Error("Nama kegiatan wajib diisi");
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah pengeluaran wajib lebih dari 0");
  if (!tanggalStr) throw new Error("Tanggal wajib diisi");

  // sumber "tabungan:<id>" untuk jenis tabungan tertentu, selain itu "kas" / "infaq".
  const [sumberDana, sumberTabunganTipeId] = sumberRaw.startsWith("tabungan:")
    ? (["tabungan", sumberRaw.slice("tabungan:".length)] as const)
    : ([sumberRaw, null] as const);
  if (!["kas", "infaq", "tabungan"].includes(sumberDana)) throw new Error("Sumber dana tidak valid");

  // Tidak boleh melebihi saldo pool sumber saat itu (§7.9).
  const tersedia = await saldoPool(tenantId, sumberDana as SumberDana, sumberTabunganTipeId);
  if (jumlah > tersedia) {
    throw new Error(`Jumlah melebihi saldo sumber dana (tersedia Rp${tersedia.toLocaleString("id-ID")})`);
  }

  let buktiUrl: string | undefined;
  const bukti = formData.get("bukti");
  if (bukti instanceof File && bukti.size > 0) {
    buktiUrl = await uploadImage(bukti, `guyub/kegiatan/${tenantId}`);
  }

  await prisma.danaKegiatan.create({
    data: {
      tenantId,
      namaKegiatan,
      sumberDana: sumberDana as SumberDana,
      sumberTabunganTipeId,
      jumlah,
      tanggal: new Date(tanggalStr),
      keterangan,
      buktiUrl,
      dicatatOlehId: user.id,
    },
  });

  // Pool tabungan dikurangi langsung di saldo pooled-nya; kas & infaq dihitung
  // turunan (saldo = pemasukan − pengeluaran kegiatan) di lib/ringkasan.ts.
  if (sumberDana === "tabungan" && sumberTabunganTipeId) {
    const pooled = await prisma.tabunganSaldo.findFirst({ where: { tabunganTipeId: sumberTabunganTipeId, userId: null } });
    if (pooled) await prisma.tabunganSaldo.update({ where: { id: pooled.id }, data: { jumlah: { decrement: jumlah } } });
  }

  revalidatePath(`/t/${tenantId}/kegiatan`);
  revalidatePath(`/t/${tenantId}`);
}
