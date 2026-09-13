"use client";

import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Masuk ke Guyub</h1>
      <button
        onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Masuk dengan Google
      </button>
    </main>
  );
}
