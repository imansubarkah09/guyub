"use client";

import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function AppHeader({ email, title }: { email: string; title?: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between border-b border-primary/15 px-4 py-3">
      <Link href="/dashboard" className="font-semibold text-primary">
        {title ?? "Guyub"}
      </Link>
      <div className="flex items-center gap-3 text-sm text-foreground/70">
        <span>{email}</span>
        <button
          onClick={() => signOut().then(() => router.push("/"))}
          className="rounded-md border border-primary/30 px-2 py-1 text-xs"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
