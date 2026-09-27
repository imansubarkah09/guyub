import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Subject VAPID sengaja URL situs, bukan email: nilai ini ikut terkirim ke
// layanan push pihak ketiga (FCM, Apple, Mozilla).
const SUBJECT = process.env.NEXT_PUBLIC_URL ?? "https://guyub.thedreamcompany.space";

export type PesanPush = { judul: string; isi: string; url: string };

// Endpoint datang dari browser, jadi bisa dipalsukan jadi URL apa saja. Tanpa
// pagar ini server kita bisa disuruh POST ke alamat sembarang tiap ada
// notifikasi (SSRF). Hanya layanan push resmi Chrome/Android, Safari, Firefox, Edge.
const HOST_RESMI = /^(fcm\.googleapis\.com|([\w-]+\.)*push\.apple\.com|([\w-]+\.)*push\.services\.mozilla\.com|([\w-]+\.)*notify\.windows\.com)$/;

export function endpointResmi(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && HOST_RESMI.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Kirim ke semua perangkat milik userIds. Tidak pernah melempar: notifikasi
 * in-app sudah tersimpan duluan, jadi gagal push tidak boleh ikut
 * menggagalkan aksi yang memicunya. Tanpa kunci VAPID (dev tanpa .env,
 * preview deploy) cukup diam.
 */
export async function kirimPush(userIds: string[], pesan: PesanPush) {
  if (userIds.length === 0) return;
  await kirim({ userId: { in: userIds } }, pesan);
}

/**
 * Konfirmasi ke satu perangkat yang baru berlangganan (pola Brokado, terbukti di
 * Android asli 27 Sep 2026): cara paling gampang membuktikan push tembus di HP
 * tanpa perlu akun kedua untuk memicu notifikasi.
 */
export async function kirimKonfirmasi(endpoint: string) {
  await kirim({ endpoint }, { judul: "Guyub", isi: "Notifikasi aktif di perangkat ini. Kabar dari tenant Anda akan muncul di sini.", url: "/dashboard" });
}

async function kirim(where: { endpoint: string } | { userId: { in: string[] } }, pesan: PesanPush) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  try {
    const subs = await prisma.pushSubscription.findMany({ where });
    const body = JSON.stringify(pesan);
    await Promise.allSettled(
      subs.filter((s) => endpointResmi(s.endpoint)).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
            vapidDetails: { subject: SUBJECT, publicKey, privateKey },
            TTL: 60 * 60 * 24,
            urgency: "high",
          });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410 = langganan sudah mati (izin dicabut, app dihapus, browser direset).
          if (status === 404 || status === 410) await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
          else console.error("[push]", status, (e as { body?: string }).body ?? e);
        }
      }),
    );
  } catch (e) {
    console.error("[push]", e);
  }
}
