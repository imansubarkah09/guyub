"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, Heart, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProfileMenu, type AccountInfo } from "@/components/profile-menu";

/**
 * Area platform owner cuma 4 halaman flat, tidak seperti nav tenant (9+ menu
 * berkategori di nav-items.ts), jadi tidak perlu file terpisah/grouping,
 * array kecil langsung di sini (§simplicity, 21 Sep 2026).
 */
const NAV: { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean }[] = [
  { href: "/admin", label: "Tenant", icon: Building2, match: (p) => p === "/admin" || p.startsWith("/admin/tenant/") },
  { href: "/platform/pengguna", label: "Pengguna", icon: Users, match: (p) => p === "/platform/pengguna" },
  { href: "/admin/trakteer", label: "Trakteer", icon: Heart, match: (p) => p === "/admin/trakteer" },
  { href: "/platform/owners", label: "Owner", icon: ShieldCheck, match: (p) => p === "/platform/owners" },
];

export function PlatformShell({ account, children }: { account: AccountInfo; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Navbar desktop: menu langsung sejajar, tidak ada bottom bar (§lg:). */}
      <header className="sticky top-0 z-40 hidden h-14 items-center justify-between gap-4 border-b border-border bg-surface/90 px-4 backdrop-blur lg:flex">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-semibold tracking-tight text-primary">
            Platform Owner
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-primary/10"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <ProfileMenu user={account} />
      </header>

      {/* Header mobile/PWA: cuma wordmark + akun, menunya di bottom bar (§lg:hidden). */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-semibold tracking-tight text-primary">
          Platform Owner
        </Link>
        <ProfileMenu user={account} />
      </header>

      <main className="mx-auto max-w-3xl p-4 pb-24 lg:pb-8">{children}</main>

      {/* Bottom bar mobile/PWA: sama persis pola TenantShell, cuma 4 menu flat
          jadi semuanya muat tanpa perlu "Lainnya". */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface lg:hidden" aria-label="Navigasi Platform Owner">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${active ? "text-primary" : "text-muted"}`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
