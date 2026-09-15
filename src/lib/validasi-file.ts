/** Dipakai di semua form upload gambar (client & server): bukti transfer kas/tabungan/kegiatan, logo tenant, foto profil. */
export const TIPE_GAMBAR_DITERIMA = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UKURAN_GAMBAR_MB = 5;

export function validasiFileGambar(file: File): string | null {
  if (!TIPE_GAMBAR_DITERIMA.includes(file.type)) {
    return "Format file tidak didukung. Pakai JPG, PNG, atau WebP.";
  }
  if (file.size > MAX_UKURAN_GAMBAR_MB * 1024 * 1024) {
    return `Ukuran file maksimal ${MAX_UKURAN_GAMBAR_MB}MB.`;
  }
  return null;
}
