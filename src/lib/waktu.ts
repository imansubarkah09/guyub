/**
 * Semua tampilan tanggal/jam di app ini wajib WIB (Asia/Jakarta), bukan ikut
 * timezone runtime server. Cloudflare Workers jalan di UTC secara default,
 * jadi tanpa `timeZone` eksplisit, "hari ini" atau jam yang ditampilkan bisa
 * meleset (terutama dini hari WIB, yang masih "kemarin" di UTC).
 */
export const TIMEZONE_WIB = "Asia/Jakarta";

const FORMAT_TANGGAL_INPUT = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE_WIB, year: "numeric", month: "2-digit", day: "2-digit" });

/** Tanggal hari ini dalam WIB, format YYYY-MM-DD, buat default `<input type="date">`. */
export function hariIniWIB(): string {
  return FORMAT_TANGGAL_INPUT.format(new Date());
}

/** Sebuah Date diformat jadi YYYY-MM-DD dalam WIB, buat defaultValue `<input type="date">` saat edit data lama. */
export function tanggalWIB(d: Date): string {
  return FORMAT_TANGGAL_INPUT.format(d);
}
