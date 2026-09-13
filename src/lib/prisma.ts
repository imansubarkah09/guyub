import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Cloudflare Workers has no raw TCP sockets, so Prisma's default engine
 * can't open a normal Postgres connection there — the Neon driver adapter
 * talks to Neon over HTTP/WebSocket instead. Same adapter works locally too,
 * so there's one code path for dev and Workers.
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
