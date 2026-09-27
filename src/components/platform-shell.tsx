"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, Heart, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GuyubLogo } from "@/components/guyub-logo";
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
      {/* Top bar di semua lebar, sama dengan TenantShell (logo + Guyub, avatar);
          menu sejajar cuma di desktop, di HP menunya di bottom bar. Tanpa
          backdrop-blur, alasannya lihat TenantShell. */}
      <header className="pt-safe sticky top-0 z-40 border-b border-border bg-surface">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard" className="flex flex-shrink-0 items-center gap-2" aria-label="Guyub, pilih tenant">
              <GuyubLogo className="h-7 w-7" />
              <span className="font-semibold tracking-tight text-primary">Guyub</span>
            </Link>
            <span className="truncate border-l border-border pl-3 text-sm text-muted lg:hidden">Platform Owner</span>
            <nav className="hidden items-center gap-1 lg:flex">
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
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 pb-24 lg:pb-8">{children}</main>

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
