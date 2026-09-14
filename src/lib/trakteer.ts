import { prisma } from "@/lib/prisma";

/**
 * Slug creator Trakteer Guyub — diisi lewat env, tidak di-hardcode.
 * Tombol/modal dukungan disembunyikan kalau slug-nya belum ada.
 */
export const TRAKTEER_SLUG = process.env.NEXT_PUBLIC_TRAKTEER_SLUG ?? "";
export const TRAKTEER_ORIGIN = "https://trakteer.id";
/** Modal overlay resmi Trakteer; `ref` diisi URL halaman pemanggil. */
export const TRAKTEER_MODAL_URL = TRAKTEER_SLUG ? `${TRAKTEER_ORIGIN}/v1/${TRAKTEER_SLUG}/tip/embed/modal` : null;

/**
 * Berapa rupiah yang setara satu hari masa aktif ("nyawa") sebuah tenant.
 * Keputusan sendiri karena dokumen tidak menyebut angkanya — dibuat env supaya
 * Iman bisa menyetel tanpa ubah kode.
 */
export const RUPIAH_PER_HARI = Number(process.env.TRAKTEER_RUPIAH_PER_HARI ?? 1000);

export function hariDariNominal(jumlah: number) {
  return Math.max(1, Math.floor(jumlah / Math.max(1, RUPIAH_PER_HARI)));
}

/**
 * Trakteer tidak mengirim "ini untuk tenant mana", jadi tenant dikenali dari
 * KODE yang ditulis donatur di pesan dukungan (mis. "#A1B2C3D4"). Kalau kodenya
 * tidak ketemu, donasi tetap dicatat tanpa tenant dan platform owner
 * menautkannya manual di /admin/trakteer.
 */
export async function cariTenantDariPesan(pesan: string | null | undefined) {
  if (!pesan) return null;
  const kandidat = pesan.toUpperCase().match(/[A-Z0-9]{6,12}/g);
  if (!kandidat) return null;
  return prisma.tenant.findFirst({ where: { kodeDonasi: { in: kandidat } } });
}

/** Tambah masa aktif tenant; kalau sudah kedaluwarsa, dihitung dari hari ini. */
export async function tambahNyawa(tenantId: string, hari: number) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const mulai = tenant.nyawaSampai && tenant.nyawaSampai > new Date() ? tenant.nyawaSampai : new Date();
  const sampai = new Date(mulai.getTime() + hari * 24 * 60 * 60 * 1000);
  await prisma.tenant.update({ where: { id: tenantId }, data: { nyawaSampai: sampai } });
  return sampai;
}

/** Sisa hari nyawa; 0 kalau habis/belum pernah didukung. */
export function sisaHari(nyawaSampai: Date | null) {
  if (!nyawaSampai) return 0;
  return Math.max(0, Math.ceil((nyawaSampai.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

/* ── Tarikan langsung dari API Trakteer ───────────────────────────────────────
 * Webhook saja tidak cukup: callback bisa gagal/terlewat, dan bentuk fieldnya
 * beda dengan yang dikirim API. Bentuk baris di bawah SUDAH dipastikan dari
 * traktir asli (dicontek dari ../brokado/src/lib/trakteer.ts, 5 Sep 2026):
 *   {"supporter_name":"Seseorang","support_message":"...","quantity":1,
 *    "amount":5000,"updated_at":"2026-09-05 19:16:04","net_amount":4711,
 *    "order_id":"3f72ffe9-..."}
 * Tiga jebakan dari sana yang ikut dibawa: tidak ada field `status`,
 * `supporter_email` null untuk QRIS guest (jadi kuncinya `order_id`), dan
 * `updated_at` dikirim tanpa zona waktu padahal jam WIB.
 */

const TRAKTEER_API = "https://api.trakteer.id/v1/public";

type Baris = Record<string, unknown>;

function pick(row: Baris, ...keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

/** "2026-09-05 19:16:04" itu jam WIB; tanpa +07:00 V8 membacanya UTC (meleset 7 jam). */
const WIB = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;
export function waktuTrakteer(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const d = new Date(WIB.test(s) ? s.replace(" ", "T") + "+07:00" : s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Catat satu baris donasi — dipakai webhook maupun tarikan API, supaya aturan
 * nyawa/penautan tenant cuma hidup di satu tempat. Idempoten lewat `orderId`.
 */
export async function catatDonasi(row: Baris) {
  const orderId = pick(row, "order_id", "transaction_id", "id") as string | null;
  if (!orderId) return { status: "invalid" as const };

  const sudahAda = await prisma.trakteerDonasi.findUnique({ where: { orderId } });
  if (sudahAda) return { status: "duplikat" as const };

  const pesan = (pick(row, "support_message", "supporter_message", "message") as string | null) ?? null;
  const jumlah =
    Number(pick(row, "amount", "total_amount", "net_amount") ?? 0) ||
    Number(row.price ?? 0) * Number(row.quantity ?? 1);
  const hari = hariDariNominal(jumlah);
  const tenant = await cariTenantDariPesan(pesan);
  const waktu = waktuTrakteer(pick(row, "updated_at", "paid_at", "created_at"));

  await prisma.trakteerDonasi.create({
    data: {
      orderId,
      tenantId: tenant?.id ?? null,
      namaDonatur: (pick(row, "supporter_name", "supporter", "name") as string | null)?.trim() || "Anonim",
      pesan,
      jumlah,
      hariNyawa: hari,
      ...(waktu ? { createdAt: waktu } : {}),
    },
  });

  if (tenant) {
    const sampai = await tambahNyawa(tenant.id, hari);
    const { notifyTenant } = await import("@/lib/notifikasi");
    await notifyTenant(
      tenant.id,
      "trakteer",
      `${(pick(row, "supporter_name") as string | null)?.trim() || "Seseorang"} mendukung tenant ini (+${hari} hari). Aktif sampai ${sampai.toLocaleDateString("id-ID")}`,
      { href: `/t/${tenant.id}` },
    );
  }

  return { status: "baru" as const, tenantId: tenant?.id ?? null, hari };
}

/**
 * Tarik riwayat traktir dari API dan catat yang belum ada. Dipakai tombol di
 * /admin/trakteer, jadi donasi tetap masuk walau webhook-nya mati.
 * ponytail: halaman dibatasi maxHal — cukup untuk volume sekarang; kalau sudah
 * ribuan baris, ganti jadi sinkron inkremental berdasarkan createdAt terakhir.
 */
export async function tarikDonasi(maxHal = 3) {
  const key = process.env.TRAKTEER_API_KEY;
  if (!key) return { baru: 0, dilihat: 0, error: "TRAKTEER_API_KEY belum diisi" };

  let baru = 0;
  let dilihat = 0;
  for (let hal = 1; hal <= maxHal; hal++) {
    const res = await fetch(
      `${TRAKTEER_API}/supports?limit=20&page=${hal}&include=order_id,supporter_email,payment_method,is_guest,net_amount`,
      { headers: { key, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } },
    );
    if (!res.ok) return { baru, dilihat, error: `HTTP ${res.status}` };

    const json = (await res.json()) as { result?: { data?: Baris[]; meta?: { pagination?: { total_pages?: number } } } };
    const rows = json.result?.data ?? [];
    for (const row of rows) {
      dilihat++;
      const hasil = await catatDonasi(row);
      if (hasil.status === "baru") baru++;
    }
    const totalHal = json.result?.meta?.pagination?.total_pages ?? 1;
    if (rows.length === 0 || hal >= totalHal) break;
  }
  return { baru, dilihat, error: null as string | null };
}
