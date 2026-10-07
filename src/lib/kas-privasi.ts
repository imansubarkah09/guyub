import type { Role } from "@prisma/client";
import { CAN_LIHAT_KETERANGAN_RAHASIA, has } from "@/lib/authz";

export const KETERANGAN_DISAMARKAN = "******";

/**
 * Samarkan keterangan Kas bertanda rahasia untuk role yang tidak berhak melihatnya.
 * WAJIB dipanggil di server sebelum data dikirim ke komponen client atau diubah jadi
 * PDF, karena yang sudah sampai ke browser tidak bisa ditarik lagi. Jumlah dan tanggal
 * tetap tampil: yang disembunyikan hanya teks keterangannya.
 */
export function samarkanKeterangan<T extends { keterangan: string | null; keteranganRahasia: boolean }>(row: T, roles: Role[]): T {
  if (!row.keteranganRahasia || has(roles, CAN_LIHAT_KETERANGAN_RAHASIA)) return row;
  return { ...row, keterangan: KETERANGAN_DISAMARKAN };
}
