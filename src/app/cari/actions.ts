"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function requestJoinAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (tenant.status !== "approved") throw new Error("Tenant ini belum bisa menerima anggota baru");

  const existing = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: user.id, tenantId } } });
  if (!existing) {
    await prisma.membership.create({ data: { userId: user.id, tenantId, roles: ["anggota"], status: "pending_confirmation" } });
  }

  revalidatePath("/cari");
}
