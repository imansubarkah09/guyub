"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_KELOLA_ANGGOTA } from "@/lib/authz";
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

  await prisma.invitation.update({ where: { id: invitationId }, data: { status: "revoked" } });
  revalidatePath(`/t/${tenantId}/anggota`);
}

export async function confirmMemberAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membershipId = String(formData.get("membershipId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  await prisma.membership.update({ where: { id: membershipId }, data: { status: "active" } });
  revalidatePath(`/t/${tenantId}/anggota`);
}

export async function updateRolesAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membershipId = String(formData.get("membershipId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const roles = ALL_ROLES.filter((r) => formData.getAll("roles").includes(r));
  if (roles.length === 0) throw new Error("Minimal satu peran harus dipilih");

  await prisma.membership.update({ where: { id: membershipId }, data: { roles } });
  revalidatePath(`/t/${tenantId}/anggota`);
}
