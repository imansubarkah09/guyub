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
  if (!periode || !jumlahSetoran) throw new Error("Periode dan jumlah setoran wajib diisi");

  await prisma.arisan.create({ data: { tenantId, periode, jumlahSetoran } });
  revalidatePath(`/t/${tenantId}/arisan`);
}

export async function addPesertaAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const arisanId = String(formData.get("arisanId"));
  const userId = String(formData.get("userId"));
  const existing = await prisma.arisanPeserta.count({ where: { arisanId } });
  await prisma.arisanPeserta.create({ data: { arisanId, userId, urutan: existing + 1 } });
  revalidatePath(`/t/${tenantId}/arisan`);
}

/** Urutan giliran diatur manual (§7.7) — naik/turun satu posisi, bukan random sistem. */
export async function geserUrutanAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const pesertaId = String(formData.get("pesertaId"));
  const arah = String(formData.get("arah"));
  const peserta = await prisma.arisanPeserta.findUniqueOrThrow({ where: { id: pesertaId }, include: { arisan: true } });
  if (peserta.arisan.tenantId !== tenantId) throw new Error("Peserta tidak ditemukan di tenant ini");

  const tetangga = await prisma.arisanPeserta.findFirst({
    where: { arisanId: peserta.arisanId, urutan: arah === "naik" ? { lt: peserta.urutan } : { gt: peserta.urutan } },
    orderBy: { urutan: arah === "naik" ? "desc" : "asc" },
  });
  if (!tetangga) return;

  await prisma.$transaction([
    prisma.arisanPeserta.update({ where: { id: peserta.id }, data: { urutan: tetangga.urutan } }),
    prisma.arisanPeserta.update({ where: { id: tetangga.id }, data: { urutan: peserta.urutan } }),
  ]);
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

/** Tutup putaran: tandai penerima giliran, naikkan nomor putaran. */
export async function tutupPutaranAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const arisanId = String(formData.get("arisanId"));
  const arisan = await prisma.arisan.findUniqueOrThrow({
    where: { id: arisanId },
    include: { peserta: { orderBy: { urutan: "asc" } } },
  });
  if (arisan.tenantId !== tenantId) throw new Error("Arisan tidak ditemukan di tenant ini");

  const penerima = arisan.peserta.find((p) => !p.statusDapat);
  if (!penerima) throw new Error("Semua peserta sudah mendapat giliran");

  await prisma.arisanPeserta.update({ where: { id: penerima.id }, data: { statusDapat: true } });
  const sisa = arisan.peserta.filter((p) => !p.statusDapat && p.id !== penerima.id).length;
  await prisma.arisan.update({
    where: { id: arisanId },
    data: { putaranBerjalan: { increment: 1 }, ...(sisa === 0 ? { status: "selesai" as const } : {}) },
  });

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
