"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import { validasiFileGambar } from "@/lib/validasi-file";
import { PREVIEW_COOKIE } from "@/lib/preview";
import { after } from "next/server";
import { endpointResmi, kirimKonfirmasi } from "@/lib/push";

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

// Dulu semua notifikasi otomatis dianggap dibaca begitu lonceng dibuka, jadi
// yang belum sempat dibuka ikut hilang tandanya (27 Sep 2026, pola inbox
// Novelis/Brokado). Sekarang per item yang dibuka, atau lewat tombol eksplisit.
export async function tandaiDibacaAction(id: string) {
  const user = await requireUser();
  await prisma.notifikasi.updateMany({ where: { id, userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
}

export async function tandaiSemuaDibacaAction() {
  const user = await requireUser();
  await prisma.notifikasi.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
}

type LanggananPush = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

/**
 * Dipanggil tiap kali menu akun dibuka di perangkat yang sudah berlangganan,
 * bukan cuma saat pertama aktif: kalau baris DB-nya sempat terhapus (410 dari
 * layanan push, ganti akun), perangkat ini tersambung lagi tanpa perlu tap ulang.
 * Upsert per endpoint: HP yang sama dipakai akun lain berarti pindah pemilik.
 */
export async function simpanPushAction(sub: LanggananPush) {
  const user = await requireUser();
  const { endpoint } = sub;
  const p256dh = sub.keys?.p256dh;
  const auth = sub.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 1000 || !endpointResmi(endpoint)) return;
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) return;
  const lama = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { userId: true } });
  // Konfirmasi cuma untuk perangkat yang baru tersambung ke akun ini, bukan tiap
  // kali menu akun dibuka (fungsi ini juga dipanggil untuk menyegarkan baris).
  if (lama?.userId !== user.id) after(() => kirimKonfirmasi(endpoint));
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userId: user.id },
    update: { p256dh, auth, userId: user.id },
  });
}

/** Saat keluar akun: HP yang dipakai bergantian tidak boleh terus menerima notifikasi akun ini. */
export async function hapusPushAction(endpoint: string) {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}

export async function exitPreviewAction() {
  (await cookies()).delete(PREVIEW_COOKIE);
  revalidatePath("/", "layout");
}
