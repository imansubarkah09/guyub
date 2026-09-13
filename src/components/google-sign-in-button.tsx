"use client";

import { signIn } from "@/lib/auth-client";

export function GoogleSignInButton({ callbackURL, label = "Masuk dengan Google" }: { callbackURL: string; label?: string }) {
  return (
    <button
      onClick={() => signIn.social({ provider: "google", callbackURL })}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
    >
      {label}
    </button>
  );
}
