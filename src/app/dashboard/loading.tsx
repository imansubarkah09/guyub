import { GuyubLogo } from "@/components/guyub-logo";

/**
 * Tanpa file ini, ketuk "Dashboard" (landing page, logo top bar, PWA) diam 1-3
 * detik tanpa tanda apa pun sampai server selesai cek sesi + ambil keanggotaan,
 * jadi terasa tidak merespons (laporan Iman 27 Sep 2026, di PWA). Dengan
 * loading.tsx, Next langsung menampilkan kerangka ini begitu diketuk. Header
 * disalin dari page.tsx supaya tidak melompat saat data datang.
 */
export default function DashboardLoading() {
  return (
    <main className="pt-safe min-h-screen" aria-busy="true" aria-label="Memuat">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <span className="flex items-center gap-2">
          <GuyubLogo className="h-7 w-7" />
          <span className="font-semibold tracking-tight text-primary">Guyub</span>
        </span>
        <span className="h-8 w-8 rounded-full bg-border" />
      </header>
      <div className="mx-auto max-w-2xl animate-pulse space-y-5 p-4">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-md bg-border" />
          <div className="h-4 w-56 rounded-md bg-border/60" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[4.5rem] rounded-[var(--radius)] border border-border bg-border/30" />
          ))}
        </div>
      </div>
    </main>
  );
}
