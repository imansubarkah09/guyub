/** Sisa hari nyawa; 0 kalau habis/belum pernah didukung. */
export function sisaHari(nyawaSampai: Date | null) {
  if (!nyawaSampai) return 0;
  return Math.max(0, Math.ceil((nyawaSampai.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}
