"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { catatAudit } from "@/lib/audit-log";
import { angkaPlerek } from "@/lib/plerek";

/** Plerek memegang uang, jadi pencatatnya bendahara, aturan §5 di src/lib/authz.ts. */
async function bolehCatat(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membership = await requireWrite(user, tenantId, CAN_CATAT_UANG);
  return { user, tenantId, membership };
}

async function catatAuditJikaPemilik(opts: { tenantId: string; aktorId: string; roles: string[]; aksi: string; deskripsi: string; nominal?: number }) {
  if (!opts.roles.includes("pemilik")) return;
  await catatAudit({
    tenantId: opts.tenantId,
    aktorId: opts.aktorId,
    peran: "pemilik",
    aksi: opts.aksi,
    deskripsi: opts.deskripsi,
    nominal: opts.nominal,
  });
}

/** Hasil satu putaran keliling: total uang dan total beras, bukan rincian per rumah. */
export async function catatPutaranAction(formData: FormData) {
  const { user, tenantId, membership } = await bolehCatat(formData);

  const tanggal = String(formData.get("tanggal"));
  const jumlahUang = Number(formData.get("jumlahUang") ?? 0);
  const berasKg = Number(formData.get("berasKg") ?? 0);
  const petugas = String(formData.get("petugas") ?? "").trim() || null;
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;

  if (!tanggal) throw new Error("Tanggal wajib diisi");
  if (jumlahUang < 0 || berasKg < 0) throw new Error("Jumlah tidak boleh negatif");
  // Putaran tanpa uang DAN tanpa beras berarti tidak ada yang dikumpulkan,
  // barisnya cuma jadi sampah di riwayat.
  if (jumlahUang === 0 && berasKg === 0) throw new Error("Isi minimal salah satu: uang atau beras");

  await prisma.plerekPutaran.create({
    data: { tenantId, tanggal: new Date(tanggal), jumlahUang, berasKg, petugas, keterangan, dicatatOlehId: user.id },
  });

  await catatAuditJikaPemilik({
    tenantId,
    aktorId: user.id,
    roles: membership.roles,
    aksi: "plerek.putaran",
    deskripsi: `Mencatat putaran plerek: Rp ${jumlahUang}, beras ${berasKg} kg`,
    nominal: jumlahUang,
  });

  revalidatePath(`/t/${tenantId}/plerek`);
}

/**
 * Beras keluar dari stok. Kalau dijual, isi hasil penjualannya dan uangnya
 * menambah pot plerek; kalau dibagikan atau dipakai, kosongkan.
 */
export async function catatBerasKeluarAction(formData: FormData) {
  const { user, tenantId, membership } = await bolehCatat(formData);

  const tanggal = String(formData.get("tanggal"));
  const berasKg = Number(formData.get("berasKg") ?? 0);
  const dijual = String(formData.get("dijual") ?? "") === "ya";
  const hasilRaw = String(formData.get("hasilPenjualan") ?? "").trim();
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;

  if (!tanggal) throw new Error("Tanggal wajib diisi");
  if (!berasKg || berasKg <= 0) throw new Error("Jumlah beras wajib lebih dari 0");
  if (dijual && (!hasilRaw || Number(hasilRaw) <= 0)) throw new Error("Isi hasil penjualannya, atau pilih 'dibagikan/dipakai'");

  const stok = (await angkaPlerek(tenantId)).stokBerasKg;
  if (berasKg > stok) throw new Error(`Beras yang keluar melebihi stok (tersisa ${stok} kg)`);

  await prisma.plerekBerasKeluar.create({
    data: {
      tenantId,
      tanggal: new Date(tanggal),
      berasKg,
      hasilPenjualan: dijual ? hasilRaw : null,
      keterangan,
      dicatatOlehId: user.id,
    },
  });

  await catatAuditJikaPemilik({
    tenantId,
    aktorId: user.id,
    roles: membership.roles,
    aksi: "plerek.beras_keluar",
    deskripsi: `Mencatat beras keluar ${berasKg} kg${dijual ? `, dijual Rp ${hasilRaw}` : " (dibagikan/dipakai)"}`,
    nominal: dijual ? Number(hasilRaw) : undefined,
  });

  revalidatePath(`/t/${tenantId}/plerek`);
}

/**
 * Pindahkan uang pot plerek ke Kas. Barisnya dibuat berpasangan dalam satu
 * transaksi: kalau KasTransaksi gagal, setorannya tidak boleh ikut tercatat,
 * karena saldo plerek akan berkurang tanpa ada uang yang masuk ke mana pun.
 */
export async function setorKeKasAction(formData: FormData) {
  const { user, tenantId, membership } = await bolehCatat(formData);

  const tanggal = String(formData.get("tanggal"));
  const jumlah = Number(formData.get("jumlah") ?? 0);
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;

  if (!tanggal) throw new Error("Tanggal wajib diisi");
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");

  const saldo = (await angkaPlerek(tenantId)).saldoUang;
  if (jumlah > saldo) throw new Error(`Setoran melebihi saldo plerek (tersedia Rp${saldo.toLocaleString("id-ID")})`);

  await prisma.$transaction(async (tx) => {
    const kas = await tx.kasTransaksi.create({
      data: {
        tenantId,
        tanggal: new Date(tanggal),
        jumlah,
        tipe: "masuk",
        keterangan: keterangan ? `Setoran Plerek — ${keterangan}` : "Setoran Plerek",
        dicatatOlehId: user.id,
      },
    });
    await tx.plerekSetoranKas.create({
      data: { tenantId, tanggal: new Date(tanggal), jumlah, kasTransaksiId: kas.id, dicatatOlehId: user.id },
    });
  });

  await catatAuditJikaPemilik({
    tenantId,
    aktorId: user.id,
    roles: membership.roles,
    aksi: "plerek.setor_kas",
    deskripsi: `Menyetor Rp ${jumlah} dari pot plerek ke kas`,
    nominal: jumlah,
  });

  revalidatePath(`/t/${tenantId}/plerek`);
  revalidatePath(`/t/${tenantId}/kas`);
}
