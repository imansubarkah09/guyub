import { cache } from "react";
import { PrismaClient } from "@/generated/prisma-workerd/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Cloudflare Workers tidak punya TCP socket mentah, jadi Prisma memakai driver
 * adapter Neon (WebSocket), bukan engine bawaan.
 *
 * PENTING (ketemu 13 Sep 2026, error 1101 di produksi): client TIDAK BOLEH
 * jadi singleton modul. Modul hidup lebih lama dari satu request di sebuah
 * isolate, sedangkan koneksi WebSocket yang dibuat pada request A haram dipakai
 * request B. Gejalanya: "Cannot perform I/O on behalf of a different request"
 * plus "Connection terminated", lalu Worker melempar exception dan Cloudflare
 * membalas halaman error 1101. Request pertama di isolate baru selalu lolos,
 * makanya bugnya terasa acak.
 *
 * `cache()` React mengikat pembuatan client ke satu request. Di luar konteks
 * request (misalnya dipanggil dari skrip) cache() hanya membuat instance baru,
 * jadi kasus terburuknya boros koneksi, bukan koneksi dipakai lintas request.
 */
const getClient = cache(
  () => new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) }),
);

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
