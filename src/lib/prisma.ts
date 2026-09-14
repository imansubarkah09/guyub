import { PrismaClient } from "@/generated/prisma-workerd/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Cloudflare Workers tidak punya TCP socket mentah, jadi Prisma memakai driver
 * adapter Neon (WebSocket), bukan engine bawaan.
 *
 * Ada dua syarat yang saling bertabrakan di sini, dan keduanya pernah
 * menjatuhkan produksi dalam satu hari (13 Sep 2026):
 *
 * 1. DI WORKERS, client TIDAK BOLEH dipakai lintas request. Koneksi yang dibuka
 *    request A haram dipakai request B: "Cannot perform I/O on behalf of a
 *    different request", lalu Worker melempar exception dan Cloudflare membalas
 *    error 1101.
 * 2. TAPI dalam SATU request, client harus SATU. Percobaan pertama memakai
 *    `cache()` React, dan ternyata di aplikasi ini cache-nya tidak mengikat ke
 *    request: terukur 3 client dibuat untuk satu kali muat halaman. Akibatnya
 *    tiap query membuka koneksi sendiri dan, yang jauh lebih berbahaya,
 *    `$transaction([...])` tersusun dari beberapa client sehingga TIDAK atomik.
 *    Penautan pasangan di Silsilah jadi setengah jalan lalu menabrak unique
 *    spouseId (error 500 P2002 yang dilihat pengguna).
 *
 * Jadi cakupannya dipatok eksplisit, tidak diserahkan ke framework:
 * - workerd: satu client per request, dititipkan ke ExecutionContext request itu.
 * - Node (next dev / next start): satu client per proses, koneksi tetap hangat
 *   seperti aplikasi Node biasa. Di Node tidak ada larangan lintas request.
 */
function buatClient() {
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }), log: process.env.PRISMA_LOG ? ["query"] : [] });
}

const diWorkers = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

type Wadah = { __prisma?: PrismaClient };

function ambilClient(): PrismaClient {
  if (diWorkers()) {
    try {
      // require dinamis, bukan import statis: modul ini khusus bundel Workers dan
      // tidak perlu ikut dimuat waktu jalan di Node (next dev / next start).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
        getCloudflareContext: () => { ctx: unknown };
      };
      const wadah = getCloudflareContext().ctx as Wadah;
      return (wadah.__prisma ??= buatClient());
    } catch {
      // Di luar konteks request (misalnya prerender saat build) tidak ada ctx.
      // Client sekali pakai aman di sini: tidak ada request lain yang mewarisinya.
      return buatClient();
    }
  }
  const g = globalThis as Wadah;
  return (g.__prisma ??= buatClient());
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = ambilClient();
    const value = Reflect.get(client, prop) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
