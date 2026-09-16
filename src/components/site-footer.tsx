import Link from "next/link";
import { TRAKTEER_MODAL_URL } from "@/lib/trakteer";

/** Footer publik dipakai index & halaman "Tentang" — satu tempat biar dua halaman tidak diam-diam bercabang. */
export function SiteFooter() {
  return (
    <footer className="border-t border-primary/15 bg-primary/5">
      <div className="mx-auto max-w-md px-4 py-10 md:max-w-2xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-lg font-bold text-primary">Guyub</span>
            <p className="mt-2 max-w-xs text-sm text-foreground/70">Kas, tabungan, qurban joinan, dan silsilah keluarga, RT, atau paguyuban, beres dalam satu tempat.</p>
          </div>
          <nav aria-label="Produk">
            <p className="text-sm font-semibold">Produk</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/register" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Daftar</Link></li>
              <li><Link href="/login" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Masuk</Link></li>
              <li><Link href="/cari" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Cari Tenant</Link></li>
            </ul>
          </nav>
          <nav aria-label="Lainnya">
            <p className="text-sm font-semibold">Lainnya</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/tentang" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Tentang</Link></li>
              {TRAKTEER_MODAL_URL && (
                <li><a href="/tentang#dukung" className="text-sm text-foreground/70 hover:text-foreground hover:underline">Dukung Pengembang</a></li>
              )}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-primary/15 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-foreground/70">
            © {new Date().getFullYear()} Guyub. Hak cipta dilindungi.
            <br />
            Guyub merupakan kontribusi dari{" "}
            <a href="https://product.thedreamcompany.space" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
              The Dream Company
            </a>
            .
          </p>
          <Link href="/login" className="text-xs text-foreground/70 hover:text-foreground hover:underline">
            Masuk
          </Link>
        </div>
      </div>
    </footer>
  );
}
