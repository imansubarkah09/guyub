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

/**
 * Keterangan Kas untuk PDF Laporan. Beda dengan tampilan web: baris rahasia tidak
 * jadi "******" tapi tetap terbaca dengan nama peminjam diganti "peminjam", mis.
 * "Cicilan pinjaman a.n. peminjam, pokok Rp250000 + bunga Rp10000". Baris rahasia
 * yang bukan soal pinjaman (dicentang manual) tetap "******" karena letak nama
 * di teks bebasnya tidak bisa ditebak.
 */
export function keteranganPdf(row: { keterangan: string | null; keteranganRahasia: boolean }, roles: Role[]): string | null {
  if (!row.keteranganRahasia || has(roles, CAN_LIHAT_KETERANGAN_RAHASIA)) return row.keterangan;
  const keterangan = row.keterangan ?? "";
  if (/a\.n\./i.test(keterangan)) return keterangan.replace(/a\.n\.\s*[^,]*/i, "a.n. peminjam");
  if (/cicilan|pinjaman/i.test(keterangan)) return "Cicilan pinjaman a.n. peminjam";
  return KETERANGAN_DISAMARKAN;
}
