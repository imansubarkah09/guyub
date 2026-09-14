import { timingSafeEqual } from "node:crypto";

/** Bandingkan token webhook tanpa bocor lewat timing perbandingan `!==` biasa. */
export function tokenCocok(diterima: string | null, diharapkan: string | undefined): boolean {
  if (!diterima || !diharapkan) return false;
  const a = Buffer.from(diterima);
  const b = Buffer.from(diharapkan);
  return a.length === b.length && timingSafeEqual(a, b);
}
