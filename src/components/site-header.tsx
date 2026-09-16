import Link from "next/link";

/**
 * Header publik dipakai index & halaman "Tentang", satu tempat biar dua halaman
 * tidak diam-diam bercabang. `loggedIn` diteruskan dari pemanggil (bukan dipanggil
 * sendiri di sini): getSessionUser() harus tetap berada di Promise.all bareng
 * query prisma lain di halaman pemanggilnya, bukan di komponen anak terpisah,
 * supaya sinyal dynamic dari headers() kebaca duluan sebelum prisma jalan
 * (ketemu 16 Sep 2026, versi lama bikin build gagal prerender statis DAN
 * wallTime Worker melonjak ~10 detik meski respons ke user tetap cepat).
 */
export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <Link href="/" className="font-semibold text-primary">Guyub</Link>
      <div className="flex items-center gap-2">
        <Link href="/tentang" className="px-2 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground hover:underline">
          Tentang
        </Link>
        {loggedIn ? (
          <Link href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="px-2 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground hover:underline">
              Masuk
            </Link>
            <Link href="/register" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
              Daftar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
