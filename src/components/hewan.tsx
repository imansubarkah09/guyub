/** Emoji hewan qurban (keputusan Iman 14 Sep 2026, ganti dari SVG ilustrasi). */
export function HewanIcon({ jenis, className = "h-5 w-5" }: { jenis: "sapi" | "kambing"; className?: string }) {
  return (
    <span className={`inline-block leading-none ${className}`} aria-hidden>
      {jenis === "sapi" ? "🐄" : "🐏"}
    </span>
  );
}
