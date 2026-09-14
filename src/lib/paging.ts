/** `take` untuk daftar riwayat: dari query param `ambil`, naik lewat tombol "Muat lebih", diklem ke `batas`. */
export function ambilDari(nilai: string | undefined, defaultNya: number, batas: number): number {
  const n = Number(nilai);
  return Number.isFinite(n) && n > defaultNya ? Math.min(n, batas) : defaultNya;
}
