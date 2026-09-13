import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Cloudflare Workers tidak punya TCP socket mentah, jadi Prisma memakai driver
 * adapter Neon (HTTP/WebSocket), bukan engine bawaan. Adapter yang sama dipakai
 * di lokal supaya dev dan produksi menempuh jalur kode yang sama.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function buildClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
