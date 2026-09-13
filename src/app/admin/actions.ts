"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { PREVIEW_COOKIE } from "@/lib/preview";
import { notify } from "@/lib/notifikasi";
import type { Role } from "@prisma/client";

export async function decideTenantAction(formData: FormData) {
  const user = await requireUser();
  requirePlatformOwner(user);

  const tenantId = String(formData.get("tenantId"));
  const decision = String(formData.get("decision"));
  const catatanOwner = String(formData.get("catatan") ?? "").trim() || null;
  if (decision !== "approved" && decision !== "rejected") throw new Error("Keputusan tidak valid");

  await prisma.tenantApprovalRequest.update({ where: { tenantId }, data: { status: decision, catatanOwner } });
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: decision === "approved" ? "approved" : "pending" } });

  const ketua = await prisma.membership.findFirst({ where: { tenantId, roles: { has: "ketua" } } });
  if (ketua) {
    await notify(
      ketua.userId,
      tenantId,
      "tenant_approval",
      decision === "approved" ? "Tenant Anda disetujui Platform Owner" : `Pendaftaran tenant ditolak${catatanOwner ? `: ${catatanOwner}` : ""}`,
      `/t/${tenantId}`,
    );
  }
  revalidatePath("/admin");
}

export async function suspendTenantAction(formData: FormData) {
  const user = await requireUser();
  requirePlatformOwner(user);
  const tenantId = String(formData.get("tenantId"));
  const suspend = String(formData.get("suspend")) === "true";

  await prisma.tenant.update({ where: { id: tenantId }, data: { status: suspend ? "suspended" : "approved" } });
  revalidatePath("/admin");
}

/** Mulai mode preview (§7.2). Cookie hanya berlaku kalau pembawanya platform owner — lihat lib/preview.ts. */
export async function startPreviewAction(formData: FormData) {
  const user = await requireUser();
  requirePlatformOwner(user);

  const tenantId = String(formData.get("tenantId"));
  const mode = String(formData.get("mode"));
  const value = String(formData.get("value") ?? "");

  const state = mode === "user" ? { tenantId, userId: value } : { tenantId, role: value as Role };
  (await cookies()).set(PREVIEW_COOKIE, JSON.stringify(state), { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(`/t/${tenantId}`);
}
