"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, MoreHorizontal, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { NAV_ITEMS } from "./nav-items";

export function TenantShell({
  tenantId,
  tenantNama,
  email,
  children,
}: {
  tenantId: string;
  tenantNama?: string | null;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const base = `/t/${tenantId}`;
  const primary = NAV_ITEMS.filter((i) => i.primary);
  const overflow = NAV_ITEMS.filter((i) => !i.primary);
  const isActive = (href: string) => pathname === `${base}${href}`;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-primary/15 bg-background px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden h-9 w-9 items-center justify-center rounded-md text-foreground/70 hover:bg-primary/10 lg:inline-flex"
            aria-label={sidebarOpen ? "Sembunyikan menu" : "Tampilkan menu"}
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <a href="/dashboard" className="truncate px-1 font-semibold text-primary">
            {tenantNama ?? "Guyub"}
          </a>
        </div>
        <div className="flex items-center gap-3 text-sm text-foreground/70">
          <span className="hidden sm:inline">{email}</span>
          <button
            onClick={() => signOut().then(() => router.push("/login"))}
            className="rounded-md border border-primary/30 px-2 py-1 text-xs"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 flex-shrink-0 overflow-y-auto border-r border-primary/15 p-3 lg:block">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={`${base}${item.href}`}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive(item.href) ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-primary/10"
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
        )}

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <div className="mx-auto max-w-lg p-4">{children}</div>
        </main>
      </div>

      {/* Bottom tab bar, satu-satunya navigasi mobile — 3 menu utama + "Lainnya". */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-primary/15 bg-background lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigasi utama"
      >
        {primary.map((item) => (
          <a
            key={item.href}
            href={`${base}${item.href}`}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${isActive(item.href) ? "text-primary" : "text-foreground/60"}`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </a>
        ))}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
            overflow.some((i) => isActive(i.href)) ? "text-primary" : "text-foreground/60"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          Lainnya
        </button>
      </nav>

      {moreOpen && (
        <>
          <button aria-label="Tutup menu" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-30 bg-black/20 lg:hidden" />
          <div className="fixed inset-x-4 bottom-16 z-30 rounded-md border border-primary/15 bg-background p-1 shadow-lg lg:hidden">
            {overflow.map((item) => (
              <a
                key={item.href}
                href={`${base}${item.href}`}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm ${isActive(item.href) ? "text-primary" : "hover:bg-primary/10"}`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </a>
            ))}
            <button
              onClick={() => signOut().then(() => router.push("/login"))}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground/70 hover:bg-primary/10"
            >
              <LogOut className="h-5 w-5" />
              Keluar
            </button>
          </div>
        </>
      )}
    </>
  );
}
