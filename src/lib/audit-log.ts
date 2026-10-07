import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * Jejak audit (lihat AuditLog di schema.prisma): dipakai terutama untuk aksi
 * yang dilakukan peran pemilik, supaya pengurus tetap bisa mengaudit siapa
 * mengubah apa, termasuk transaksi uang yang biasanya cuma milik bendahara.
 * Dipanggil di action site setelah aksi berhasil, bukan sebelum, supaya tidak
 * ada entri audit untuk aksi yang gagal.
 */
export async function catatAudit(opts: { tenantId: string; aktorId: string; peran: Role; aksi: string; deskripsi: string; nominal?: number }) {
  await prisma.auditLog.create({
    data: {
      tenantId: opts.tenantId,
      aktorId: opts.aktorId,
      peran: opts.peran,
      aksi: opts.aksi,
      deskripsi: opts.deskripsi,
      nominal: opts.nominal,
    },
  });
}
