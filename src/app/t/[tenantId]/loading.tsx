/**
 * Fallback tiap pindah menu di dalam tenant. Dirender DI DALAM TenantShell
 * (lihat layout.tsx), jadi header dan bottom nav tetap berdiri dan hanya area
 * konten yang jadi skeleton. Tanpa ini, navigasi client-side terasa menggantung
 * karena halaman tenant selalu menunggu query DB dulu.
 *
 * Skeleton, bukan spinner: bentuk halaman sudah terbaca sebelum datanya datang.
 */
export default function TenantLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4" aria-busy="true" aria-label="Memuat">
      <div className="h-7 w-44 rounded-md bg-border" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-border bg-border/40" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg border border-border bg-border/25" />
        ))}
      </div>
    </div>
  );
}
