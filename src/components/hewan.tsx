/**
 * Ilustrasi sapi & kambing (§4). Sengaja SVG, bukan emoji: emoji tidak
 * ter-render di sebagian perangkat/webview (terbukti kosong saat screenshot
 * Chromium), dan §4 memang minta ilustrasi, bukan emoji polos.
 */
export function HewanIcon({ jenis, className = "h-5 w-5" }: { jenis: "sapi" | "kambing"; className?: string }) {
  if (jenis === "sapi") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9c0-1.7 1.3-3 3-3h10c1.7 0 3 1.3 3 3v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
        <path d="M4 9 2.4 6.2A1 1 0 0 1 3.4 4.8L6.5 6M20 9l1.6-2.8a1 1 0 0 0-1-1.4L17.5 6" />
        <path d="M9.5 12h.01M14.5 12h.01" />
        <path d="M9 15.5c.8.7 1.9 1 3 1s2.2-.3 3-1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 10c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-3Z" />
      <path d="M7.5 6.5C6.5 5 5.5 4 4 3.5c.3 1.8.9 3 2 4M16.5 6.5c1-1.5 2-2.5 3.5-3-.3 1.8-.9 3-2 4" />
      <path d="M10 12h.01M14 12h.01" />
      <path d="M11 15.5h2" />
    </svg>
  );
}
