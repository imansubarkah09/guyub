import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const PREVIEW_COOKIE = "guyub_preview";

export type PreviewState = { tenantId: string; role?: Role; userId?: string };

/**
 * Mode "Preview as Role/User" (§7.2). Cookie-nya tidak perlu ditandatangani karena
 * nilainya divalidasi ulang di sini: kalau yang membawa cookie bukan platform owner,
 * cookie-nya diabaikan total. Jadi user biasa yang memalsukan cookie ini tidak dapat
 * apa-apa — bukan menambah izin, dan mode preview justru MENGURANGI izin (read-only).
 */
export async function getPreview(user: { isPlatformOwner: boolean }): Promise<PreviewState | null> {
  if (!user.isPlatformOwner) return null;
  const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PreviewState;
    return parsed.tenantId ? parsed : null;
  } catch {
    return null;
  }
}

/** Dipanggil di setiap jalur tulis. Preview selalu read-only, apa pun role yang di-preview. */
export async function assertNotPreview(user: { isPlatformOwner: boolean }) {
  if (await getPreview(user)) {
    throw new Error("Mode Preview bersifat read-only — aksi tulis dinonaktifkan.");
  }
}
