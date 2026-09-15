"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, requireMemberWrite, CAN_CATAT_UANG } from "@/lib/authz";
import type { BungaMode } from "@prisma/client";

/** Anggota mana pun boleh mengajukan; belum menyentuh saldo Kas sampai bendahara approve. */
export async function ajukanPinjamanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMemberWrite(user, tenantId);

  const jumlahPokok = Number(formData.get("jumlahPokok"));
  const bungaMode = String(formData.get("bungaMode"));
  const bungaPersenRaw = String(formData.get("bungaPersen") ?? "").trim();
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  if (!jumlahPokok || jumlahPokok <= 0) throw new Error("Jumlah pinjaman wajib lebih dari 0");
  if (bungaMode !== "tanpa" && bungaMode !== "persen" && bungaMode !== "sukarela") throw new Error("Mode bunga tidak valid");
  if (bungaMode === "persen" && (!bungaPersenRaw || Number(bungaPersenRaw) <= 0)) {
    throw new Error("Isi persen bunga untuk mode bunga persen");
  }

  await prisma.pinjaman.create({
    data: {
      tenantId,
      peminjamId: user.id,
      jumlahPokok,
      bungaMode: bungaMode as BungaMode,
      bungaPersen: bungaMode === "persen" ? bungaPersenRaw : null,
      keterangan,
    },
  });

  revalidatePath(`/t/${tenantId}/pinjaman`);
}

/**
 * Peminjam boleh batalkan pengajuannya sendiri selama masih "diajukan" — belum
 * menyentuh saldo Kas sama sekali, jadi aman dihapus langsung (bukan sekadar
 * diubah status) kalau ternyata salah input. Begitu sudah diputuskan bendahara,
 * tidak bisa dibatalkan lewat sini lagi.
 */
export async function batalkanPinjamanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMemberWrite(user, tenantId);

  const pinjamanId = String(formData.get("pinjamanId"));
  const pinjaman = await prisma.pinjaman.findUniqueOrThrow({ where: { id: pinjamanId } });
  if (pinjaman.tenantId !== tenantId) throw new Error("Pinjaman tidak ditemukan di tenant ini");
  if (pinjaman.peminjamId !== user.id) throw new Error("Kamu cuma bisa membatalkan pengajuanmu sendiri");
  if (pinjaman.status !== "diajukan") throw new Error("Pinjaman ini sudah diproses, tidak bisa dibatalkan");

  await prisma.pinjaman.delete({ where: { id: pinjamanId } });

  revalidatePath(`/t/${tenantId}/pinjaman`);
}

/** Hanya bendahara — approve mencairkan dana (dicatat sebagai KasTransaksi keluar), tolak tidak menyentuh Kas sama sekali. */
export async function putuskanPinjamanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const pinjamanId = String(formData.get("pinjamanId"));
  const decision = String(formData.get("decision"));
  if (decision !== "disetujui" && decision !== "ditolak") throw new Error("Keputusan tidak valid");

  const pinjaman = await prisma.pinjaman.findUniqueOrThrow({ where: { id: pinjamanId }, include: { peminjam: { select: { name: true } } } });
  if (pinjaman.tenantId !== tenantId) throw new Error("Pinjaman tidak ditemukan di tenant ini");
  if (pinjaman.status !== "diajukan") throw new Error("Pinjaman ini sudah diproses");

  if (decision === "disetujui") {
    await prisma.$transaction([
      prisma.pinjaman.update({
        where: { id: pinjamanId },
        data: { status: "disetujui", diputuskanOlehId: user.id, diputuskanPada: new Date() },
      }),
      prisma.kasTransaksi.create({
        data: {
          tenantId,
          tanggal: new Date(),
          jumlah: pinjaman.jumlahPokok,
          tipe: "keluar",
          keterangan: `Pencairan pinjaman - ${pinjaman.peminjam.name}`,
          dicatatOlehId: user.id,
        },
      }),
    ]);
  } else {
    await prisma.pinjaman.update({
      where: { id: pinjamanId },
      data: { status: "ditolak", diputuskanOlehId: user.id, diputuskanPada: new Date() },
    });
  }

  revalidatePath(`/t/${tenantId}/pinjaman`);
  revalidatePath(`/t/${tenantId}/kas`);
}

/** Hanya bendahara mencatat cicilan (sama seperti transaksi Kas lain — pengurus mencatat uang tunai). */
export async function catatCicilanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const pinjamanId = String(formData.get("pinjamanId"));
  const jumlahPokokDibayar = Number(formData.get("jumlahPokok"));
  const jumlahBunga = Number(formData.get("jumlahBunga") ?? 0);
  if (!jumlahPokokDibayar || jumlahPokokDibayar <= 0) throw new Error("Jumlah pokok dibayar wajib lebih dari 0");
  if (jumlahBunga < 0) throw new Error("Jumlah bunga tidak boleh negatif");

  const pinjaman = await prisma.pinjaman.findUniqueOrThrow({
    where: { id: pinjamanId },
    include: { peminjam: { select: { name: true } }, cicilan: { select: { jumlahPokok: true } } },
  });
  if (pinjaman.tenantId !== tenantId) throw new Error("Pinjaman tidak ditemukan di tenant ini");
  if (pinjaman.status !== "disetujui") throw new Error("Pinjaman ini belum disetujui atau sudah lunas");

  const sudahDibayar = pinjaman.cicilan.reduce((a, c) => a + Number(c.jumlahPokok), 0);
  const sisaPokok = Number(pinjaman.jumlahPokok) - sudahDibayar;
  if (jumlahPokokDibayar > sisaPokok) throw new Error(`Pokok dibayar melebihi sisa pinjaman (sisa Rp${sisaPokok})`);

  const lunas = jumlahPokokDibayar === sisaPokok;
  const total = jumlahPokokDibayar + jumlahBunga;

  await prisma.$transaction([
    prisma.pinjamanCicilan.create({
      data: {
        pinjamanId,
        tanggal: new Date(),
        jumlahPokok: jumlahPokokDibayar,
        jumlahBunga,
        dicatatOlehId: user.id,
      },
    }),
    prisma.kasTransaksi.create({
      data: {
        tenantId,
        tanggal: new Date(),
        jumlah: total,
        tipe: "masuk",
        keterangan: `Cicilan pinjaman - ${pinjaman.peminjam.name}${jumlahBunga > 0 ? ` (pokok Rp${jumlahPokokDibayar} + bunga Rp${jumlahBunga})` : ""}`,
        dicatatOlehId: user.id,
      },
    }),
    ...(lunas ? [prisma.pinjaman.update({ where: { id: pinjamanId }, data: { status: "lunas" as const } })] : []),
  ]);

  revalidatePath(`/t/${tenantId}/pinjaman`);
  revalidatePath(`/t/${tenantId}/kas`);
}
