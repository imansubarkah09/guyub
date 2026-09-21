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

export type DecideTenantResult = { error: string } | null;

/**
 * Sebelum ini formAction biasa (throw mentah kalau gagal), yang di production
 * cuma menampilkan halaman error generik Next.js alih-alih kembali ke /admin
 * (ketemu 17 Sep 2026: platform owner lapor klik "Tolak" reload ke error page).
 * Sekarang dibungkus try/catch dan mengembalikan {error} lewat useActionState,
 * pola yang sama dengan fix React error #441 di kas/laporan sebelumnya.
 */
export async function decideTenantAction(_prevState: DecideTenantResult, formData: FormData): Promise<DecideTenantResult> {
  const user = await requireUser();
  requirePlatformOwner(user);

  const tenantId = String(formData.get("tenantId"));
  const decision = String(formData.get("decision"));
  const catatanOwner = String(formData.get("catatan") ?? "").trim() || null;
  if (decision !== "approved" && decision !== "rejected") return { error: "Keputusan tidak valid" };

  try {
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
  } catch (e) {
    console.error("Keputusan tenant gagal", e);
    return { error: "Gagal menyimpan keputusan. Coba lagi, atau cek Runtime Logs di Vercel kalau masih gagal." };
  }

  revalidatePath("/admin");
  return null;
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
