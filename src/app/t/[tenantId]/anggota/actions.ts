"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, requireMemberWrite, CAN_KELOLA_ANGGOTA, PENGURUS, KETUA } from "@/lib/authz";
import { notify } from "@/lib/notifikasi";
import type { Role } from "@prisma/client";

const ALL_ROLES: Role[] = ["ketua", "wakil_ketua", "bendahara", "sekretaris", "anggota"];

/** Siapa saja anggota aktif boleh bikin & sebar link undangan (permintaan Iman, 16 Sep 2026), yang dibatasi cuma persetujuan anggota baru (confirmMemberAction), bukan siapa yang boleh mengundang. */
export async function generateInviteAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMemberWrite(user, tenantId);

  await prisma.invitation.create({ data: { tenantId, createdById: user.id } });
  revalidatePath(`/t/${tenantId}/anggota`);
  // Tombol "Undang Keluarga/Warga Bergabung" di Dashboard juga pakai undangan aktif ini.
  revalidatePath(`/t/${tenantId}`);
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
  // Seluruh pengurus (ketua, wakil ketua, bendahara, sekretaris) boleh approve
  // anggota baru, lebih longgar dari CAN_KELOLA_ANGGOTA yang dipakai kelola
  // peran/undangan (permintaan Iman, 16 Sep 2026).
  await requireWrite(user, tenantId, PENGURUS);

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

  const sayaKetua = me.roles.some((r) => KETUA.includes(r));

  // Peran ketua yang sedang menjabat cuma boleh diubah ketua/wakil ketua
  // (koreksi salah klik, atau serah terima jabatan) atau platform owner,
  // BUKAN sekretaris (ketemu 16 Sep 2026: sekretaris salah klik menjadikan
  // anggota lain ketua, dan lock sebelumnya keliru ikut mengunci ketua/owner
  // sendiri, jadi kesalahan itu tidak bisa dikoreksi siapa pun).
  if (target.roles.includes("ketua") && !sayaKetua && !user.isPlatformOwner) {
    throw new Error("Cuma ketua/wakil ketua yang menjabat atau platform owner yang bisa mengubah peran ketua");
  }

  const roles = ALL_ROLES.filter((r) => formData.getAll("roles").includes(r));
  if (roles.length === 0) throw new Error("Minimal satu peran harus dipilih");

  // §5: sekretaris boleh mengubah role, kecuali mengangkat DIRINYA SENDIRI jadi
  // ketua. Wakil ketua ikut dijaga karena izinnya sama persis dengan ketua.
  const naikJadiKetua = KETUA.some((r) => roles.includes(r) && !target.roles.includes(r));
  if (!sayaKetua && target.userId === user.id && naikJadiKetua) {
    throw new Error("Sekretaris tidak bisa mengangkat dirinya sendiri menjadi ketua atau wakil ketua");
  }

  await prisma.membership.update({ where: { id: membershipId }, data: { roles } });

  const baru = roles.filter((r) => !target.roles.includes(r));
  if (baru.length > 0 && target.userId !== user.id) {
    await notify(target.userId, tenantId, "role_berubah", `Anda diset menjadi ${baru.join(" & ")} oleh ${user.name}`, `/t/${tenantId}`);
  }
  revalidatePath(`/t/${tenantId}/anggota`);
}
