"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMembership, CAN_KELOLA_TABUNGAN } from "@/lib/authz";
import { uploadImage } from "@/lib/upload";
import type { TabunganMode } from "@prisma/client";

async function creditSaldo(tabunganTipeId: string, mode: TabunganMode, targetUserId: string | null, jumlah: number) {
  if (mode === "pooled") {
    const existing = await prisma.tabunganSaldo.findFirst({ where: { tabunganTipeId, userId: null } });
    if (existing) {
      await prisma.tabunganSaldo.update({ where: { id: existing.id }, data: { jumlah: { increment: jumlah } } });
    } else {
      await prisma.tabunganSaldo.create({ data: { tabunganTipeId, userId: null, jumlah } });
    }
  } else {
    if (!targetUserId) throw new Error("Anggota tujuan wajib diisi untuk tabungan individual");
    await prisma.tabunganSaldo.upsert({
      where: { tabunganTipeId_userId: { tabunganTipeId, userId: targetUserId } },
      update: { jumlah: { increment: jumlah } },
      create: { tabunganTipeId, userId: targetUserId, jumlah },
    });
  }
}

export async function createTabunganTipeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_TABUNGAN);

  const nama = String(formData.get("nama") ?? "").trim();
  const mode = String(formData.get("mode"));
  if (!nama || (mode !== "individual" && mode !== "pooled")) throw new Error("Nama dan mode wajib diisi");

  await prisma.tabunganTipe.create({ data: { tenantId, nama, mode: mode as TabunganMode } });
  revalidatePath(`/t/${tenantId}/tabungan`);
}

export async function setorAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_TABUNGAN);

  const tabunganTipeId = String(formData.get("tabunganTipeId"));
  const jumlah = Number(formData.get("jumlah"));
  const targetUserId = String(formData.get("userId") ?? "") || null;
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");

  const tipe = await prisma.tabunganTipe.findUniqueOrThrow({ where: { id: tabunganTipeId } });
  if (tipe.tenantId !== tenantId) throw new Error("Tipe tabungan tidak ditemukan di tenant ini");
  if (tipe.mode === "individual" && !targetUserId) throw new Error("Pilih anggota untuk tabungan individual");

  await creditSaldo(tabunganTipeId, tipe.mode, targetUserId, jumlah);
  revalidatePath(`/t/${tenantId}/tabungan`);
}

/** Fase 4 (§5) — anggota mana pun bisa mengajukan setoran transfer dengan bukti foto; belum menambah saldo sampai divalidasi. */
export async function submitSetoranBuktiAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId);

  const tabunganTipeId = String(formData.get("tabunganTipeId"));
  const jumlah = Number(formData.get("jumlah"));
  const bukti = formData.get("bukti");
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");
  if (!(bukti instanceof File) || bukti.size === 0) throw new Error("Foto bukti transfer wajib diunggah");

  const tipe = await prisma.tabunganTipe.findUniqueOrThrow({ where: { id: tabunganTipeId } });
  if (tipe.tenantId !== tenantId) throw new Error("Tipe tabungan tidak ditemukan di tenant ini");

  const buktiUrl = await uploadImage(bukti, `guyub/tabungan/${tenantId}`);
  await prisma.tabunganSetoran.create({ data: { tabunganTipeId, userId: user.id, jumlah, buktiUrl } });

  revalidatePath(`/t/${tenantId}/tabungan`);
}

export async function validasiSetoranAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_KELOLA_TABUNGAN);

  const setoranId = String(formData.get("setoranId"));
  const decision = String(formData.get("decision"));
  if (decision !== "valid" && decision !== "ditolak") throw new Error("Keputusan tidak valid");

  const setoran = await prisma.tabunganSetoran.findUniqueOrThrow({ where: { id: setoranId }, include: { tabunganTipe: true } });
  if (setoran.tabunganTipe.tenantId !== tenantId) throw new Error("Setoran tidak ditemukan di tenant ini");
  if (setoran.status !== "pending") throw new Error("Setoran ini sudah diproses");

  if (decision === "valid") {
    await creditSaldo(setoran.tabunganTipeId, setoran.tabunganTipe.mode, setoran.userId, Number(setoran.jumlah));
  }
  await prisma.tabunganSetoran.update({
    where: { id: setoranId },
    data: { status: decision, divalidasiOlehId: user.id },
  });

  revalidatePath(`/t/${tenantId}/tabungan`);
}
