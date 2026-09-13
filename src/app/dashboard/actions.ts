"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { TenantJenis } from "@prisma/client";

const JENIS: TenantJenis[] = ["keluarga", "rt", "paguyuban"];

export async function createTenantAction(formData: FormData) {
  const user = await requireUser();
  const jenis = String(formData.get("jenis"));
  const nama = String(formData.get("nama") ?? "").trim();
  if (!JENIS.includes(jenis as TenantJenis) || !nama) {
    throw new Error("Jenis dan nama tenant wajib diisi");
  }

  const tenant = await prisma.tenant.create({
    data: {
      jenis: jenis as TenantJenis,
      profile: { create: { nama } },
      approvalRequest: { create: {} },
      memberships: { create: { userId: user.id, roles: ["ketua"], status: "active" } },
    },
  });

  revalidatePath("/dashboard");
  return tenant.id;
}
