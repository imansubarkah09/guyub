"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_ATUR_ARISAN } from "@/lib/authz";

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

export async function toggleDapatAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_ATUR_ARISAN);

  const pesertaId = String(formData.get("pesertaId"));
  const peserta = await prisma.arisanPeserta.update({
    where: { id: pesertaId },
    data: { statusDapat: true },
  });

  const semua = await prisma.arisanPeserta.findMany({ where: { arisanId: peserta.arisanId } });
  if (semua.every((p) => p.statusDapat)) {
    await prisma.arisan.update({ where: { id: peserta.arisanId }, data: { status: "selesai" } });
  }

  revalidatePath(`/t/${tenantId}/arisan`);
}
