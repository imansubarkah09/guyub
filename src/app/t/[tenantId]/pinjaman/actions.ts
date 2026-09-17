"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, requireMemberWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { notifyTenant } from "@/lib/notifikasi";
import { rupiah } from "@/components/ui";
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

  // Ketemu 17 Sep 2026: pengajuan pinjaman tidak pernah memberi tahu bendahara,
  // jadi menumpuk di status "diajukan" tanpa ada yang tahu perlu diputuskan.
  await notifyTenant(tenantId, "pinjaman_diajukan", `${user.name} mengajukan pinjaman ${rupiah.format(jumlahPokok)}`, {
    roles: CAN_CATAT_UANG,
    href: `/t/${tenantId}/pinjaman`,
    kecuali: user.id,
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

/**
 * Hanya bendahara — approve mencairkan dana (dicatat sebagai KasTransaksi keluar), tolak
 * tidak menyentuh Kas sama sekali.
 *
 * Guard status pakai `updateMany` (bukan baca-lalu-`update`) supaya klik dobel atau dua
 * bendahara memutuskan pinjaman yang sama di saat bersamaan tidak mencairkan dana dua kali:
 * `updateMany` mengunci baris di Postgres, jadi transaksi kedua selalu melihat status yang
 * sudah berubah dan `count` jadi 0 (ketemu saat review 15 Sep 2026).
 */
export async function putuskanPinjamanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const pinjamanId = String(formData.get("pinjamanId"));
  const decision = String(formData.get("decision"));
  if (decision !== "disetujui" && decision !== "ditolak") throw new Error("Keputusan tidak valid");

  const pinjaman = await prisma.pinjaman.findUniqueOrThrow({ where: { id: pinjamanId } });
  if (pinjaman.tenantId !== tenantId) throw new Error("Pinjaman tidak ditemukan di tenant ini");

  if (decision === "disetujui") {
    const { count } = await prisma.$transaction(async (tx) => {
      const result = await tx.pinjaman.updateMany({
        where: { id: pinjamanId, status: "diajukan" },
        data: { status: "disetujui", diputuskanOlehId: user.id, diputuskanPada: new Date() },
      });
      if (result.count === 1) {
        await tx.kasTransaksi.create({
          data: {
            tenantId,
            tanggal: new Date(),
            jumlah: pinjaman.jumlahPokok,
            tipe: "keluar",
            // Sengaja TIDAK menyebut nama peminjam — riwayat Kas ini tampil ke
            // SEMUA anggota (transparan), sedangkan detail siapa yang pinjam
            // cuma boleh dilihat bendahara & peminjamnya sendiri di halaman
            // Simpan Pinjam (instruksi Iman 15 Sep 2026).
            keterangan: "Pencairan pinjaman (Simpan Pinjam)",
            dicatatOlehId: user.id,
          },
        });
      }
      return result;
    });
    if (count === 0) throw new Error("Pinjaman ini sudah diproses");
  } else {
    const { count } = await prisma.pinjaman.updateMany({
      where: { id: pinjamanId, status: "diajukan" },
      data: { status: "ditolak", diputuskanOlehId: user.id, diputuskanPada: new Date() },
    });
    if (count === 0) throw new Error("Pinjaman ini sudah diproses");
  }

  revalidatePath(`/t/${tenantId}/pinjaman`);
  revalidatePath(`/t/${tenantId}/kas`);
}

/**
 * Hanya bendahara mencatat cicilan (sama seperti transaksi Kas lain — pengurus mencatat
 * uang tunai). Sisa pokok dihitung dari baca `cicilan` yang sudah ada, jadi dua submit
 * cicilan yang sama-sama lolos cek "tidak melebihi sisa" bisa bikin total bayar kebablasan
 * lewat pokok pinjaman. Isolation level Serializable bikin Postgres yang mendeteksi
 * tabrakan itu dan menolak salah satunya (ketemu saat review 15 Sep 2026, sama kelasnya
 * dengan rebutan pasangan P2002 di silsilah/actions.ts).
 */
export async function catatCicilanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const pinjamanId = String(formData.get("pinjamanId"));
  const jumlahPokokDibayar = Number(formData.get("jumlahPokok"));
  const jumlahBunga = Number(formData.get("jumlahBunga") ?? 0);
  if (!jumlahPokokDibayar || jumlahPokokDibayar <= 0) throw new Error("Jumlah pokok dibayar wajib lebih dari 0");
  if (jumlahBunga < 0) throw new Error("Jumlah bunga tidak boleh negatif");

  try {
    await prisma.$transaction(
      async (tx) => {
        const pinjaman = await tx.pinjaman.findUniqueOrThrow({
          where: { id: pinjamanId },
          include: { cicilan: { select: { jumlahPokok: true } } },
        });
        if (pinjaman.tenantId !== tenantId) throw new Error("Pinjaman tidak ditemukan di tenant ini");
        if (pinjaman.status !== "disetujui") throw new Error("Pinjaman ini belum disetujui atau sudah lunas");

        const sudahDibayar = pinjaman.cicilan.reduce((a, c) => a + Number(c.jumlahPokok), 0);
        const sisaPokok = Number(pinjaman.jumlahPokok) - sudahDibayar;
        if (jumlahPokokDibayar > sisaPokok) throw new Error(`Pokok dibayar melebihi sisa pinjaman (sisa Rp${sisaPokok})`);

        const lunas = jumlahPokokDibayar === sisaPokok;
        const total = jumlahPokokDibayar + jumlahBunga;

        await tx.pinjamanCicilan.create({
          data: { pinjamanId, tanggal: new Date(), jumlahPokok: jumlahPokokDibayar, jumlahBunga, dicatatOlehId: user.id },
        });
        await tx.kasTransaksi.create({
          data: {
            tenantId,
            tanggal: new Date(),
            jumlah: total,
            tipe: "masuk",
            // Sama seperti pencairan: tanpa nama peminjam, riwayat ini transparan
            // ke semua anggota (§harden privasi, 15 Sep 2026).
            keterangan: `Cicilan pinjaman (Simpan Pinjam)${jumlahBunga > 0 ? `, pokok Rp${jumlahPokokDibayar} + bunga Rp${jumlahBunga}` : ""}`,
            dicatatOlehId: user.id,
          },
        });
        if (lunas) await tx.pinjaman.update({ where: { id: pinjamanId }, data: { status: "lunas" } });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2034") {
      throw new Error("Ada yang mencatat cicilan pinjaman ini di saat bersamaan. Muat ulang halaman lalu coba lagi.");
    }
    throw e;
  }

  revalidatePath(`/t/${tenantId}/pinjaman`);
  revalidatePath(`/t/${tenantId}/kas`);
}
