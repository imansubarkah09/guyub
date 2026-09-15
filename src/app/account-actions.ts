"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import { validasiFileGambar } from "@/lib/validasi-file";
import { PREVIEW_COOKIE } from "@/lib/preview";

/**
 * Profil pribadi (§7.13) — boleh diedit semua role, termasuk saat platform owner sedang
 * preview. Upload & write dibungkus try/catch (bukan throw mentah) supaya kegagalan
 * Cloudinary/DB tampil sebagai pesan jelas, bukan React error #441 (lihat kas/actions.ts).
 */
export async function updateAccountAction(formData: FormData): Promise<{ error: string } | null> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name) return { error: "Nama wajib diisi" };

  let image: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const pesanValidasi = validasiFileGambar(avatar);
    if (pesanValidasi) return { error: pesanValidasi };
    try {
      image = await uploadImage(avatar, `guyub/avatar/${user.id}`);
    } catch (e) {
      console.error("Upload foto profil gagal", e);
      return { error: "Gagal mengunggah foto profil. Coba lagi atau pakai file lain." };
    }
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: { name, phone, ...(image ? { image } : {}) } });
  } catch (e) {
    console.error("Simpan profil akun gagal", e);
    return { error: "Gagal menyimpan profil. Coba lagi." };
  }
  await buangCacheSesi();
  revalidatePath("/", "layout");
  return null;
}

/**
 * Cache sesi di cookie (lihat src/lib/auth.ts) ikut menyimpan nama, foto, dan
 * nomor telepon. Tanpa dibuang di sini, header dan checklist Dashboard masih
 * menampilkan data lama sampai cache habis, dan pengguna mengira simpanannya gagal.
 */
async function buangCacheSesi() {
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("session_data")) jar.delete(c.name);
}

export async function markNotifReadAction() {
  const user = await requireUser();
  await prisma.notifikasi.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
}

export async function exitPreviewAction() {
  (await cookies()).delete(PREVIEW_COOKIE);
  revalidatePath("/", "layout");
}
