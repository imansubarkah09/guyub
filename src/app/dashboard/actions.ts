"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notifyUsers } from "@/lib/notifikasi";
import type { TenantJenis } from "@prisma/client";

const JENIS: TenantJenis[] = ["keluarga", "rt", "paguyuban"];

export async function createTenantAction(formData: FormData) {
  const user = await requireUser();
  const jenis = String(formData.get("jenis"));
  const nama = String(formData.get("nama") ?? "").trim();
  if (!JENIS.includes(jenis as TenantJenis) || !nama) {
    throw new Error("Jenis dan nama tenant wajib diisi");
  }

  // Tenant milik platform owner tidak perlu antre persetujuan: dia sendiri yang
  // jadi penyetujunya, jadi langsung approved.
  const otomatisDisetujui = user.isPlatformOwner;

  const tenant = await prisma.tenant.create({
    data: {
      jenis: jenis as TenantJenis,
      status: otomatisDisetujui ? "approved" : "pending",
      profile: { create: { nama } },
      approvalRequest: { create: otomatisDisetujui ? { status: "approved" } : {} },
      memberships: { create: { userId: user.id, roles: ["ketua"], status: "active" } },
    },
  });

  // Platform owner perlu tahu ada antrean approval baru (§7.12).
  const owners = otomatisDisetujui
    ? []
    : await prisma.user.findMany({ where: { isPlatformOwner: true }, select: { id: true } });
  await notifyUsers(
    owners.map((o) => o.id),
    tenant.id,
    "tenant_baru",
    `Tenant baru "${nama}" menunggu persetujuan`,
    "/admin",
  );

  revalidatePath("/dashboard");
  return tenant.id;
}
