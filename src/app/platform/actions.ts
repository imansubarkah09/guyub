"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";

export async function decideTenantAction(formData: FormData) {
  const user = await requireUser();
  requirePlatformOwner(user);

  const tenantId = String(formData.get("tenantId"));
  const decision = String(formData.get("decision"));
  const catatanOwner = String(formData.get("catatan") ?? "").trim() || null;
  if (decision !== "approved" && decision !== "rejected") throw new Error("Keputusan tidak valid");

  await prisma.tenantApprovalRequest.update({
    where: { tenantId },
    data: { status: decision, catatanOwner },
  });
  if (decision === "approved") {
    await prisma.tenant.update({ where: { id: tenantId }, data: { status: "approved" } });
  }

  revalidatePath("/platform");
}
