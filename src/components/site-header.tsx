import Link from "next/link";
import { getSessionUser } from "@/lib/session";

/** Header publik dipakai index & halaman "Tentang" — satu tempat biar dua halaman tidak diam-diam bercabang. */
export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="flex items-center justify-between px-4 py-3">
      <Link href="/" className="font-semibold text-primary">Guyub</Link>
      <div className="flex items-center gap-2">
        <Link href="/tentang" className="px-2 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground hover:underline">
          Tentang
        </Link>
        {user ? (
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
