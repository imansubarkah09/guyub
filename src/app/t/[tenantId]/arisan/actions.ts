"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_ATUR_ARISAN, CAN_CATAT_UANG } from "@/lib/authz";
import { notifyTenant } from "@/lib/notifikasi";

export async function createArisanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const periode = String(formData.get("periode") ?? "").trim();
  const jumlahSetoran = String(formData.get("jumlahSetoran"));
  const pemenangPerPutaran = Math.max(1, Number(formData.get("pemenangPerPutaran") ?? 1));
  const potonganPersen = String(formData.get("potonganPersen") ?? "0");
  const potonganKeterangan = String(formData.get("potonganKeterangan") ?? "").trim() || null;
  if (!periode || !jumlahSetoran) throw new Error("Periode dan jumlah setoran wajib diisi");
  if (Number(potonganPersen) < 0 || Number(potonganPersen) > 100) throw new Error("Potongan harus 0-100%");

  await prisma.arisan.create({
    data: { tenantId, periode, jumlahSetoran, pemenangPerPutaran, potonganPersen, potonganKeterangan },
  });
  revalidatePath(`/t/${tenantId}/arisan`);
}

/** Tambah slot peserta. Orang yang sama boleh ditambah berkali-kali (Iman 1, Iman 2, …). */
export async function addPesertaAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const arisanId = String(formData.get("arisanId"));
  const userId = String(formData.get("userId"));
  const jumlahSlot = Math.max(1, Math.min(20, Number(formData.get("jumlahSlot") ?? 1)));
  const sudahDapat = formData.get("sudahDapat") === "on";

  const arisan = await prisma.arisan.findUniqueOrThrow({ where: { id: arisanId } });
  if (arisan.tenantId !== tenantId) throw new Error("Arisan tidak ditemukan di tenant ini");

  const [totalSlot, slotOrangIni] = await Promise.all([
    prisma.arisanPeserta.count({ where: { arisanId } }),
    prisma.arisanPeserta.count({ where: { arisanId, userId } }),
  ]);

  await prisma.arisanPeserta.createMany({
    data: Array.from({ length: jumlahSlot }, (_, i) => ({
      arisanId,
      userId,
      nomorSlot: slotOrangIni + i + 1,
      urutan: totalSlot + i + 1,
      // Pengurus bisa langsung menandai slot yang sudah pernah dapat, supaya
      // tidak ikut diundi lagi (permintaan: input peserta yang sudah dapat).
      statusDapat: sudahDapat,
      putaranDapat: sudahDapat ? 0 : null,
    })),
  });

  revalidatePath(`/t/${tenantId}/arisan`);
}

export async function hapusPesertaAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const pesertaId = String(formData.get("pesertaId"));
  const peserta = await prisma.arisanPeserta.findUniqueOrThrow({ where: { id: pesertaId }, include: { arisan: true } });
  if (peserta.arisan.tenantId !== tenantId) throw new Error("Peserta tidak ditemukan di tenant ini");

  await prisma.arisanPeserta.delete({ where: { id: pesertaId } });
  revalidatePath(`/t/${tenantId}/arisan`);
}

/** Tandai/batalkan slot sebagai sudah pernah dapat, tanpa lewat undian. */
export async function toggleSudahDapatAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const pesertaId = String(formData.get("pesertaId"));
  const peserta = await prisma.arisanPeserta.findUniqueOrThrow({ where: { id: pesertaId }, include: { arisan: true } });
  if (peserta.arisan.tenantId !== tenantId) throw new Error("Peserta tidak ditemukan di tenant ini");

  await prisma.arisanPeserta.update({
    where: { id: pesertaId },
    data: { statusDapat: !peserta.statusDapat, putaranDapat: peserta.statusDapat ? null : 0 },
  });
  revalidatePath(`/t/${tenantId}/arisan`);
}

/**
 * Hasil kocokan disimpan SETELAH roda berhenti. Pemenang ditentukan server
 * (klien hanya menganimasikan ke indeks yang diberikan server) supaya tidak bisa
 * diatur dari devtools.
 */
export async function simpanUndianAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const arisanId = String(formData.get("arisanId"));
  const pesertaIds = formData.getAll("pesertaId").map(String);
  const arisan = await prisma.arisan.findUniqueOrThrow({ where: { id: arisanId }, include: { peserta: { include: { user: true } } } });
  if (arisan.tenantId !== tenantId) throw new Error("Arisan tidak ditemukan di tenant ini");

  const pot = arisan.peserta.length * Number(arisan.jumlahSetoran);
  const potongan = (pot * Number(arisan.potonganPersen)) / 100;
  const diterima = (pot - potongan) / Math.max(1, pesertaIds.length);

  for (const pesertaId of pesertaIds) {
    const peserta = arisan.peserta.find((p) => p.id === pesertaId);
    if (!peserta || peserta.statusDapat) continue;
    await prisma.$transaction([
      prisma.arisanUndian.create({
        data: { arisanId, pesertaId, putaran: arisan.putaranBerjalan, jumlahDiterima: diterima },
      }),
      prisma.arisanPeserta.update({ where: { id: pesertaId }, data: { statusDapat: true, putaranDapat: arisan.putaranBerjalan } }),
    ]);
  }

  // Pemenang terakhir jadi KANDIDAT tuan rumah berikutnya — masih bisa menolak.
  const terakhir = pesertaIds.at(-1);
  if (terakhir) await prisma.arisan.update({ where: { id: arisanId }, data: { kandidatTuanRumahId: terakhir } });

  const nama = pesertaIds.map((id) => arisan.peserta.find((p) => p.id === id)?.user.name).filter(Boolean);
  if (nama.length > 0) {
    await notifyTenant(tenantId, "arisan_undian", `Hasil kocokan arisan ${arisan.periode}: ${nama.join(" & ")}`, {
      href: `/t/${tenantId}/arisan`,
      kecuali: user.id,
    });
  }

  revalidatePath(`/t/${tenantId}/arisan`);
}

/** Pemenang menolak mengambil: undiannya dibatalkan dan slotnya ikut lagi. */
export async function batalkanUndianAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const undianId = String(formData.get("undianId"));
  const catatan = String(formData.get("catatan") ?? "").trim() || null;
  const undian = await prisma.arisanUndian.findUniqueOrThrow({ where: { id: undianId }, include: { arisan: true } });
  if (undian.arisan.tenantId !== tenantId) throw new Error("Undian tidak ditemukan di tenant ini");
  if (undian.status === "dibatalkan") throw new Error("Undian ini sudah dibatalkan");

  await prisma.$transaction([
    prisma.arisanUndian.update({ where: { id: undianId }, data: { status: "dibatalkan", catatan } }),
    prisma.arisanPeserta.update({ where: { id: undian.pesertaId }, data: { statusDapat: false, putaranDapat: null } }),
  ]);

  // Kalau yang dibatalkan itu kandidat tuan rumah, lepas juga kandidatnya.
  if (undian.arisan.kandidatTuanRumahId === undian.pesertaId) {
    await prisma.arisan.update({ where: { id: undian.arisanId }, data: { kandidatTuanRumahId: null } });
  }

  revalidatePath(`/t/${tenantId}/arisan`);
}

/** Kandidat tuan rumah menolak ketempatan — jadwal dikosongkan, pilih manual lewat halaman Jadwal. */
export async function tolakTuanRumahAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const arisanId = String(formData.get("arisanId"));
  const arisan = await prisma.arisan.findUniqueOrThrow({ where: { id: arisanId } });
  if (arisan.tenantId !== tenantId) throw new Error("Arisan tidak ditemukan di tenant ini");

  await prisma.arisan.update({ where: { id: arisanId }, data: { kandidatTuanRumahId: null } });
  revalidatePath(`/t/${tenantId}/arisan`);
}

export async function lanjutPutaranAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const arisanId = String(formData.get("arisanId"));
  const arisan = await prisma.arisan.findUniqueOrThrow({ where: { id: arisanId }, include: { peserta: true } });
  if (arisan.tenantId !== tenantId) throw new Error("Arisan tidak ditemukan di tenant ini");

  const sisa = arisan.peserta.filter((p) => !p.statusDapat).length;
  await prisma.arisan.update({
    where: { id: arisanId },
    data: { putaranBerjalan: { increment: 1 }, ...(sisa === 0 ? { status: "selesai" as const } : {}) },
  });
  revalidatePath(`/t/${tenantId}/arisan`);
}

/** Tandai bayar untuk putaran berjalan — HANYA bendahara (§5). */
export async function toggleBayarAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const arisanId = String(formData.get("arisanId"));
  const userId = String(formData.get("userId"));
  const arisan = await prisma.arisan.findUniqueOrThrow({ where: { id: arisanId } });
  if (arisan.tenantId !== tenantId) throw new Error("Arisan tidak ditemukan di tenant ini");

  const key = { arisanId_userId_putaran: { arisanId, userId, putaran: arisan.putaranBerjalan } };
  const existing = await prisma.arisanPembayaran.findUnique({ where: key });
  if (existing) await prisma.arisanPembayaran.delete({ where: key });
  else await prisma.arisanPembayaran.create({ data: { arisanId, userId, putaran: arisan.putaranBerjalan } });

  revalidatePath(`/t/${tenantId}/arisan`);
}

export async function updateJadwalAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const arisanId = String(formData.get("arisanId"));
  const jadwalTanggalStr = String(formData.get("jadwalTanggal") ?? "");
  const jadwalTempat = String(formData.get("jadwalTempat") ?? "").trim() || null;
  const arisan = await prisma.arisan.findUniqueOrThrow({ where: { id: arisanId } });
  if (arisan.tenantId !== tenantId) throw new Error("Arisan tidak ditemukan di tenant ini");

  await prisma.arisan.update({
    where: { id: arisanId },
    data: { jadwalTanggal: jadwalTanggalStr ? new Date(jadwalTanggalStr) : null, jadwalTempat },
  });

  if (jadwalTanggalStr) {
    const tgl = new Date(jadwalTanggalStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    await notifyTenant(tenantId, "arisan_jadwal", `Jadwal arisan berikutnya: ${tgl}${jadwalTempat ? ` di ${jadwalTempat}` : ""}`, {
      href: `/t/${tenantId}/arisan/jadwal`,
      kecuali: user.id,
    });
  }

  revalidatePath(`/t/${tenantId}/arisan/jadwal`);
  revalidatePath(`/t/${tenantId}`);
}
