"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_KELOLA_ANGGOTA } from "@/lib/authz";

/**
 * Pasangan itu simetris: kalau A menikah dengan B, maka B juga menikah dengan A.
 * Sebelumnya field-nya ditulis satu arah, dan karena `spouseId` unik, memilih
 * orang yang sudah jadi pasangan node lain langsung meledak jadi error Prisma
 * mentah di layar. Di sini pasangan lama kedua belah pihak dilepas dulu, lalu
 * keduanya ditautkan dalam satu transaksi.
 */
async function setPasangan(nodeId: string, spouseId: string | null) {
  const [node, calon] = await Promise.all([
    prisma.familyNode.findUniqueOrThrow({ where: { id: nodeId }, include: { spouseOf: true } }),
    spouseId ? prisma.familyNode.findUnique({ where: { id: spouseId }, include: { spouseOf: true } }) : null,
  ]);
  if (spouseId && !calon) throw new Error("Pasangan yang dipilih tidak ditemukan");
  if (calon && calon.tenantId !== node.tenantId) throw new Error("Pasangan harus dari tenant yang sama");

  // Siapa saja yang harus dilepas tautannya supaya tidak menabrak unique spouseId.
  const lepas = new Set<string>();
  if (node.spouseId) lepas.add(node.id);
  for (const p of node.spouseOf) lepas.add(p.id);
  if (calon) {
    if (calon.spouseId) lepas.add(calon.id);
    for (const p of calon.spouseOf) lepas.add(p.id);
  }

  await prisma.$transaction([
    ...[...lepas].map((id) => prisma.familyNode.update({ where: { id }, data: { spouseId: null } })),
    ...(spouseId
      ? [
          prisma.familyNode.update({ where: { id: nodeId }, data: { spouseId } }),
          prisma.familyNode.update({ where: { id: spouseId }, data: { spouseId: nodeId } }),
        ]
      : []),
  ]);
}

/** Cegah lingkaran: X tidak boleh menjadikan keturunannya sendiri sebagai orang tua. */
async function assertBukanKeturunan(nodeId: string, parentId: string | null) {
  if (!parentId) return;
  let cur: string | null = parentId;
  const dilihat = new Set<string>();
  while (cur && !dilihat.has(cur)) {
    if (cur === nodeId) throw new Error("Orang tua tidak boleh diambil dari keturunannya sendiri");
    dilihat.add(cur);
    const p: { parentId: string | null } | null = await prisma.familyNode.findUnique({
      where: { id: cur },
      select: { parentId: true },
    });
    cur = p?.parentId ?? null;
  }
}

export async function addFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) throw new Error("Nama wajib diisi");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const spouseId = String(formData.get("spouseId") ?? "") || null;
  const userId = String(formData.get("userId") ?? "") || null;

  const node = await prisma.familyNode.create({ data: { tenantId, nama, parentId, userId } });
  if (spouseId) await setPasangan(node.id, spouseId);

  revalidatePath(`/t/${tenantId}/silsilah`);
}

export async function updateFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const nodeId = String(formData.get("nodeId"));
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) throw new Error("Nama wajib diisi");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const spouseId = String(formData.get("spouseId") ?? "") || null;
  if (parentId === nodeId) throw new Error("Tidak bisa jadi orang tua sendiri");
  if (spouseId === nodeId) throw new Error("Tidak bisa jadi pasangan sendiri");

  const node = await prisma.familyNode.findUniqueOrThrow({ where: { id: nodeId }, include: { spouseOf: true } });
  if (node.tenantId !== tenantId) throw new Error("Data silsilah tidak ditemukan di tenant ini");
  await assertBukanKeturunan(nodeId, parentId);

  await prisma.familyNode.update({ where: { id: nodeId }, data: { nama, parentId } });

  // Pasangan efektif node ini bisa tersimpan di kedua arah, jadi bandingkan keduanya.
  const pasanganSekarang = node.spouseId ?? node.spouseOf[0]?.id ?? null;
  if (pasanganSekarang !== spouseId) await setPasangan(nodeId, spouseId);

  revalidatePath(`/t/${tenantId}/silsilah`);
}
