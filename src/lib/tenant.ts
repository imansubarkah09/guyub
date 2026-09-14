import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Baris Tenant + nama profilnya dibaca layout tenant (gerbang akses & judul header)
 * lalu dibaca lagi oleh halamannya sendiri. cache() React menyatukannya jadi satu
 * query per request; tanpa ini Dashboard menembakkan dua SELECT Tenant dan dua
 * SELECT TenantProfile yang isinya sama persis.
 *
 * approvalRequest sengaja TIDAK ikut: isinya cuma dipakai saat tenant belum
 * disetujui, sedangkan include-nya jadi satu query tambahan di SETIAP halaman
 * tenant yang sudah berjalan normal.
 */
export const tenantDenganProfil = cache((tenantId: string) =>
  prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, nyawaSampai: true, kodeDonasi: true, profile: { select: { nama: true } } },
  }),
);
