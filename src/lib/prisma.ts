import { PrismaClient } from "@prisma/client";

/**
 * Migrasi Cloudflare Workers -> Vercel (2026-09-21): Node.js runtime Vercel
 * punya TCP socket biasa dan proses yang hidup lama, jadi tidak butuh lagi
 * driver adapter Neon (WebSocket) maupun scoping per-request lewat
 * ExecutionContext. Singleton biasa, sama seperti school-community.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.PRISMA_LOG ? ["query"] : [] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
