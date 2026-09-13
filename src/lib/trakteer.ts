import { prisma } from "@/lib/prisma";

/**
 * Slug creator Trakteer Guyub — diisi lewat env, tidak di-hardcode.
 * Tombol/modal dukungan disembunyikan kalau slug-nya belum ada.
 */
export const TRAKTEER_SLUG = process.env.NEXT_PUBLIC_TRAKTEER_SLUG ?? "";
export const TRAKTEER_ORIGIN = "https://trakteer.id";
/** Modal overlay resmi Trakteer; `ref` diisi URL halaman pemanggil. */
export const TRAKTEER_MODAL_URL = TRAKTEER_SLUG ? `${TRAKTEER_ORIGIN}/v1/${TRAKTEER_SLUG}/tip/embed/modal` : null;
export const TRAKTEER_PAGE_URL = TRAKTEER_SLUG ? `${TRAKTEER_ORIGIN}/${TRAKTEER_SLUG}/tip` : null;

/**
 * Berapa rupiah yang setara satu hari masa aktif ("nyawa") sebuah tenant.
 * Keputusan sendiri karena dokumen tidak menyebut angkanya — dibuat env supaya
 * Iman bisa menyetel tanpa ubah kode.
 */
export const RUPIAH_PER_HARI = Number(process.env.TRAKTEER_RUPIAH_PER_HARI ?? 1000);

export function hariDariNominal(jumlah: number) {
  return Math.max(1, Math.floor(jumlah / Math.max(1, RUPIAH_PER_HARI)));
}

/**
 * Trakteer tidak mengirim "ini untuk tenant mana", jadi tenant dikenali dari
 * KODE yang ditulis donatur di pesan dukungan (mis. "#A1B2C3D4"). Kalau kodenya
 * tidak ketemu, donasi tetap dicatat tanpa tenant dan platform owner
 * menautkannya manual di /admin/trakteer.
 */
export async function cariTenantDariPesan(pesan: string | null | undefined) {
  if (!pesan) return null;
  const kandidat = pesan.toUpperCase().match(/[A-Z0-9]{6,12}/g);
  if (!kandidat) return null;
  return prisma.tenant.findFirst({ where: { kodeDonasi: { in: kandidat } } });
}

/** Tambah masa aktif tenant; kalau sudah kedaluwarsa, dihitung dari hari ini. */
export async function tambahNyawa(tenantId: string, hari: number) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const mulai = tenant.nyawaSampai && tenant.nyawaSampai > new Date() ? tenant.nyawaSampai : new Date();
  const sampai = new Date(mulai.getTime() + hari * 24 * 60 * 60 * 1000);
  await prisma.tenant.update({ where: { id: tenantId }, data: { nyawaSampai: sampai } });
  return sampai;
}

/** Sisa hari nyawa; 0 kalau habis/belum pernah didukung. */
export function sisaHari(nyawaSampai: Date | null) {
  if (!nyawaSampai) return 0;
  return Math.max(0, Math.ceil((nyawaSampai.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}
