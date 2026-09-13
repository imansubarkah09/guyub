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
  // Named AUTH_SECRET/NEXTAUTH_URL (not the BETTER_AUTH_* defaults) to match
  // the env convention shared across thedreamcompany's other projects.
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.NEXTAUTH_URL,
  trustedOrigins: [
    ...(process.env.NEXTAUTH_URL ? [process.env.NEXTAUTH_URL] : []),
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
  user: {
    additionalFields: {
      isPlatformOwner: { type: "boolean", defaultValue: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        /** First login matching OWNER_EMAIL becomes Platform Owner (§2) — there's no admin UI yet to grant this any other way. */
        async after(user) {
          if (process.env.OWNER_EMAIL && user.email === process.env.OWNER_EMAIL) {
            await prisma.user.update({ where: { id: user.id }, data: { isPlatformOwner: true } });
          }
        },
      },
    },
  },
});
