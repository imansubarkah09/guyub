import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Better Auth instance — Google is the only sign-in provider (spec §2/§8
 * Fase 0). Sessions persist via Prisma into User/Account/Session/Verification.
 * Membership (role per tenant) is a separate table created after sign-in,
 * not part of auth itself — see prisma/schema.prisma.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    "https://guyub.thedreamcompany.space",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
});
