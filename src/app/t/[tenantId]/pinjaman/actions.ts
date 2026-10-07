"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, requireMemberWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { catatAudit } from "@/lib/audit-log";
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
  const membership = await requireWrite(user, tenantId, CAN_CATAT_UANG);

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
        const kas = await tx.kasTransaksi.create({
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
        // Tautan ini yang mengunci nominal baris pencairan di form edit Kas.
        await tx.pinjaman.update({ where: { id: pinjamanId }, data: { kasPencairanId: kas.id } });
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

  if (membership.roles.includes("pemilik")) {
    await catatAudit({
      tenantId,
      aktorId: user.id,
      peran: "pemilik",
      aksi: "pinjaman.putuskan",
      deskripsi: `Memutuskan pinjaman ${pinjamanId}: ${decision}`,
      nominal: decision === "disetujui" ? Number(pinjaman.jumlahPokok) : undefined,
    });
  }

  revalidatePath(`/t/${tenantId}/pinjaman`);
  revalidatePath(`/t/${tenantId}/kas`);
}

export type CicilanActionState = { error: string } | null;

const pesanTabrakan = "Ada yang mengubah cicilan pinjaman ini di saat bersamaan. Muat ulang halaman lalu coba lagi.";

/** Prisma P2034: transaksi Serializable kalah tabrakan dengan transaksi lain. */
function tabrakan(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2034";
}

/**
 * Hanya bendahara mencatat cicilan (sama seperti transaksi Kas lain — pengurus mencatat
 * uang tunai). Sisa pokok dihitung dari baca `cicilan` yang sudah ada, jadi dua submit
 * cicilan yang sama-sama lolos cek "tidak melebihi sisa" bisa bikin total bayar kebablasan
 * lewat pokok pinjaman. Isolation level Serializable bikin Postgres yang mendeteksi
 * tabrakan itu dan menolak salah satunya (ketemu saat review 15 Sep 2026, sama kelasnya
 * dengan rebutan pasangan P2002 di silsilah/actions.ts).
 *
 * Mengembalikan pesan, bukan throw: Next.js meredaksi pesan error yang dilempar di
 * produksi, jadi dulu bendahara cuma melihat halaman error tanpa tahu salahnya apa.
 */
export async function catatCicilanAction(formData: FormData): Promise<CicilanActionState> {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membership = await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const pinjamanId = String(formData.get("pinjamanId"));
  const jumlahPokokDibayar = Number(formData.get("jumlahPokok"));
  const jumlahBunga = Number(formData.get("jumlahBunga") || 0);
  if (!Number.isFinite(jumlahPokokDibayar) || jumlahPokokDibayar <= 0) return { error: "Jumlah pokok dibayar wajib lebih dari 0" };
  if (!Number.isFinite(jumlahBunga) || jumlahBunga < 0) return { error: "Jumlah bunga tidak boleh negatif" };

  try {
    const hasil = await prisma.$transaction(
      async (tx): Promise<CicilanActionState> => {
        const pinjaman = await tx.pinjaman.findUnique({
          where: { id: pinjamanId },
          include: { cicilan: { select: { jumlahPokok: true } }, peminjam: { select: { name: true } } },
        });
        if (!pinjaman || pinjaman.tenantId !== tenantId) return { error: "Pinjaman tidak ditemukan di tenant ini" };
        if (pinjaman.status !== "disetujui") return { error: "Pinjaman ini belum disetujui atau sudah lunas" };

        const sudahDibayar = pinjaman.cicilan.reduce((a, c) => a + Number(c.jumlahPokok), 0);
        const sisaPokok = Number(pinjaman.jumlahPokok) - sudahDibayar;
        if (jumlahPokokDibayar > sisaPokok) return { error: `Pokok dibayar melebihi sisa pinjaman (sisa ${rupiah.format(sisaPokok)})` };

        const lunas = jumlahPokokDibayar === sisaPokok;
        const total = jumlahPokokDibayar + jumlahBunga;

        const kas = await tx.kasTransaksi.create({
          data: {
            tenantId,
            tanggal: new Date(),
            jumlah: total,
            tipe: "masuk",
            // Menyebut nama peminjam supaya bendahara bisa menelusuri, tapi baris ini
            // ditandai rahasia: halaman Kas transparan untuk semua anggota, jadi role
            // selain bendahara dan pemilik hanya melihat "******" (lib/kas-privasi.ts).
            keterangan: `Cicilan pinjaman a.n. ${pinjaman.peminjam.name}${jumlahBunga > 0 ? `, pokok Rp${jumlahPokokDibayar} + bunga Rp${jumlahBunga}` : ""}`,
            keteranganRahasia: true,
            dicatatOlehId: user.id,
          },
        });
        await tx.pinjamanCicilan.create({
          data: { pinjamanId, tanggal: new Date(), jumlahPokok: jumlahPokokDibayar, jumlahBunga, kasTransaksiId: kas.id, dicatatOlehId: user.id },
        });
        if (lunas) await tx.pinjaman.update({ where: { id: pinjamanId }, data: { status: "lunas" } });
        return null;
      },
      { isolationLevel: "Serializable" },
    );
    if (hasil) return hasil;
  } catch (e) {
    if (tabrakan(e)) return { error: pesanTabrakan };
    console.error("Catat cicilan pinjaman gagal", e);
    return { error: "Gagal mencatat cicilan. Coba lagi." };
  }

  if (membership.roles.includes("pemilik")) {
    await catatAudit({
      tenantId,
      aktorId: user.id,
      peran: "pemilik",
      aksi: "pinjaman.cicil",
      deskripsi: `Mencatat cicilan pinjaman ${pinjamanId}: pokok Rp ${jumlahPokokDibayar} + bunga Rp ${jumlahBunga}`,
      nominal: jumlahPokokDibayar + jumlahBunga,
    });
  }

  revalidatePath(`/t/${tenantId}/pinjaman`);
  revalidatePath(`/t/${tenantId}/kas`);
  return null;
}

/**
 * Jalan koreksi cicilan yang salah input: hapus cicilan TERAKHIR beserta baris Kas
 * yang dibuatnya, dan kalau pinjamannya sempat jadi lunas, kembalikan ke berjalan.
 * Dulu tidak ada jalan ini, jadi bendahara mengedit baris Kas-nya saja dan Kas tidak
 * cocok lagi dengan Simpan Pinjam (kejadian 3 Okt 2026).
 *
 * Cuma cicilan terakhir, supaya urutan sisa pokok (dan saran bunga persen yang
 * dihitung dari sisa itu) tidak berlubang di tengah. Serializable untuk alasan yang
 * sama dengan catatCicilanAction: dua bendahara membatalkan bersamaan, atau satu
 * membatalkan sambil yang lain mencatat cicilan baru.
 */
export async function batalkanCicilanAction(formData: FormData): Promise<CicilanActionState> {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membership = await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const cicilanId = String(formData.get("cicilanId"));
  let dibatalkan: { pinjamanId: string; nominal: number } | undefined;

  try {
    const hasil = await prisma.$transaction(
      async (tx): Promise<CicilanActionState> => {
        const cicilan = await tx.pinjamanCicilan.findUnique({
          where: { id: cicilanId },
          include: { pinjaman: { select: { id: true, tenantId: true, status: true } } },
        });
        if (!cicilan || cicilan.pinjaman.tenantId !== tenantId) return { error: "Cicilan tidak ditemukan di tenant ini" };
        if (cicilan.pinjaman.status !== "disetujui" && cicilan.pinjaman.status !== "lunas") {
          return { error: "Pinjaman ini tidak sedang berjalan atau lunas" };
        }

        const terakhir = await tx.pinjamanCicilan.findFirst({
          where: { pinjamanId: cicilan.pinjamanId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true },
        });
        if (terakhir?.id !== cicilan.id) return { error: "Hanya cicilan terakhir yang bisa dibatalkan" };
        if (!cicilan.kasTransaksiId) {
          return { error: "Cicilan lama ini tidak tertaut ke baris Kas (barisnya sudah pernah diedit), jadi tidak bisa dibatalkan otomatis. Hubungi admin." };
        }

        await tx.pinjamanCicilan.delete({ where: { id: cicilan.id } });
        const { count } = await tx.kasTransaksi.deleteMany({ where: { id: cicilan.kasTransaksiId, tenantId } });
        if (count !== 1) throw new Error(`Baris Kas cicilan ${cicilan.id} tidak ditemukan`);
        if (cicilan.pinjaman.status === "lunas") {
          await tx.pinjaman.update({ where: { id: cicilan.pinjamanId }, data: { status: "disetujui" } });
        }

        dibatalkan = { pinjamanId: cicilan.pinjamanId, nominal: Number(cicilan.jumlahPokok) + Number(cicilan.jumlahBunga) };
        return null;
      },
      { isolationLevel: "Serializable" },
    );
    if (hasil) return hasil;
  } catch (e) {
    if (tabrakan(e)) return { error: pesanTabrakan };
    console.error("Batalkan cicilan pinjaman gagal", e);
    return { error: "Gagal membatalkan cicilan. Coba lagi." };
  }

  if (dibatalkan && membership.roles.includes("pemilik")) {
    await catatAudit({
      tenantId,
      aktorId: user.id,
      peran: "pemilik",
      aksi: "pinjaman.batal_cicil",
      deskripsi: `Membatalkan cicilan ${cicilanId} pinjaman ${dibatalkan.pinjamanId}`,
      nominal: dibatalkan.nominal,
    });
  }

  revalidatePath(`/t/${tenantId}/pinjaman`);
  revalidatePath(`/t/${tenantId}/kas`);
  return null;
}
