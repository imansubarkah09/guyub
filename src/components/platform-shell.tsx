"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Building2, Users, Heart, ShieldCheck, UserRound, X } from "lucide-react";
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
  // Sama dengan TenantShell: tertutup sendiri begitu pindah halaman dari tautan di dalamnya.
  const [drawerDi, setDrawerDi] = useState<string | null>(null);
  const drawer = drawerDi === pathname;
  const setDrawer = (buka: boolean) => setDrawerDi(buka ? pathname : null);

  return (
    <div className="pt-safe min-h-screen">
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

      <main className="mx-auto max-w-3xl p-4 pb-24 lg:pb-8">{children}</main>

      {/* Header disembunyikan total di mobile/PWA (§adapt, 26 Sep 2026): dulu
          selalu tampil dan terasa seperti chrome browser di atas layar HP.
          Akun sekarang lewat tab "Akun" di bottom bar, buka drawer ringan. */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Tutup menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/40" />
          <div className="pt-safe absolute inset-y-0 right-0 w-72 max-w-[85vw] overflow-y-auto bg-surface p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="truncate font-semibold text-primary">Akun</span>
              <button onClick={() => setDrawer(false)} aria-label="Tutup" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ProfileMenu user={account} inline defaultOpen />
          </div>
        </div>
      )}

      {/* Bottom bar mobile/PWA: 4 menu flat + "Akun" (dulu di header, sekarang
          di sini karena headernya sudah tidak tampil di mobile). */}
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
        <button onClick={() => setDrawer(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted transition">
          <UserRound className="h-5 w-5" />
          Akun
        </button>
      </nav>
    </div>
  );
}
