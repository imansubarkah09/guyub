/**
 * Slug creator Trakteer Guyub — isi via env, bukan hardcode, karena belum ada
 * akun Trakteer resmi Guyub saat file ini ditulis (lihat NEXT_PUBLIC_TRAKTEER_SLUG
 * di .env.example). Tombol donasi disembunyikan kalau kosong, bukan ditautkan
 * ke slug yang ditebak/salah.
 */
export const TRAKTEER_SLUG = process.env.NEXT_PUBLIC_TRAKTEER_SLUG ?? "";
export const TRAKTEER_PAGE_URL = TRAKTEER_SLUG ? `https://trakteer.id/${TRAKTEER_SLUG}/tip` : null;
