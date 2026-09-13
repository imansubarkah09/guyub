"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_KELOLA_ANGGOTA } from "@/lib/authz";
import { notify } from "@/lib/notifikasi";
import type { Role } from "@prisma/client";

const ALL_ROLES: Role[] = ["ketua", "bendahara", "sekretaris", "anggota"];

export async function generateInviteAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  await prisma.invitation.create({ data: { tenantId, createdById: user.id } });
  revalidatePath(`/t/${tenantId}/anggota`);
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const invitationId = String(formData.get("invitationId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const inv = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
  if (inv.tenantId !== tenantId) throw new Error("Undangan tidak ditemukan di tenant ini");

  await prisma.invitation.update({ where: { id: invitationId }, data: { status: "revoked" } });
  revalidatePath(`/t/${tenantId}/anggota`);
}

export async function confirmMemberAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membershipId = String(formData.get("membershipId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const target = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } });
  if (target.tenantId !== tenantId) throw new Error("Anggota tidak ditemukan di tenant ini");

  await prisma.membership.update({ where: { id: membershipId }, data: { status: "active" } });
  await notify(target.userId, tenantId, "anggota_disetujui", `${user.name} menyetujui Anda bergabung`, `/t/${tenantId}`);
  revalidatePath(`/t/${tenantId}/anggota`);
}

export async function updateRolesAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membershipId = String(formData.get("membershipId"));
  const me = await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const target = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } });
  if (target.tenantId !== tenantId) throw new Error("Anggota tidak ditemukan di tenant ini");

  const roles = ALL_ROLES.filter((r) => formData.getAll("roles").includes(r));
  if (roles.length === 0) throw new Error("Minimal satu peran harus dipilih");

  // §5: sekretaris boleh mengubah role, kecuali mengangkat DIRINYA SENDIRI jadi ketua.
  const sayaKetua = me.roles.includes("ketua");
  if (!sayaKetua && target.userId === user.id && roles.includes("ketua") && !target.roles.includes("ketua")) {
    throw new Error("Sekretaris tidak bisa mengangkat dirinya sendiri menjadi ketua");
  }

  await prisma.membership.update({ where: { id: membershipId }, data: { roles } });

  const baru = roles.filter((r) => !target.roles.includes(r));
  if (baru.length > 0 && target.userId !== user.id) {
    await notify(target.userId, tenantId, "role_berubah", `Anda diset menjadi ${baru.join(" & ")} oleh ${user.name}`, `/t/${tenantId}`);
  }
  revalidatePath(`/t/${tenantId}/anggota`);
}
