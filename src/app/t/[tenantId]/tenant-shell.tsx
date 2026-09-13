"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, MoreHorizontal, X, Eye } from "lucide-react";
import { NAV_GROUPS, ALL_NAV } from "./nav-items";
import { NotifBell, type NotifItem } from "@/components/notif-bell";
import { ProfileMenu, type AccountInfo } from "@/components/profile-menu";
import { exitPreviewAction } from "@/app/account-actions";

export function TenantShell({
  tenantId,
  tenantNama,
  account,
  notif,
  unread,
  isKetua,
  previewLabel,
  children,
}: {
  tenantId: string;
  tenantNama: string;
  account: AccountInfo;
  notif: NotifItem[];
  unread: number;
  isKetua: boolean;
  previewLabel: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const base = `/t/${tenantId}`;
  const visible = (i: { ketuaOnly?: boolean }) => !i.ketuaOnly || isKetua;
  const isActive = (href: string) => pathname === `${base}${href}`;
  const primary = ALL_NAV.filter((i) => i.primary && visible(i));
  const overflow = ALL_NAV.filter((i) => !i.primary && visible(i));

  return (
    <div className="min-h-screen">
      {previewLabel && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-accent px-3 py-2 text-xs text-white">
          <span className="flex min-w-0 items-center gap-1.5">
            <Eye className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Mode Preview — {previewLabel}. Semua aksi tulis dinonaktifkan.</span>
          </span>
          <form action={exitPreviewAction}>
            <button className="flex-shrink-0 rounded-md bg-white/20 px-2 py-1 font-medium">Keluar Preview</button>
          </form>
        </div>
      )}

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-1">
          <button onClick={() => setDrawer(true)} aria-label="Buka menu" className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-primary/10 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <a href={base} className="truncate px-1 font-semibold tracking-tight text-primary">
            {tenantNama}
          </a>
        </div>
        <div className="flex items-center gap-1">
          <NotifBell items={notif} unread={unread} />
          <ProfileMenu user={account} />
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 flex-shrink-0 overflow-y-auto border-r border-border p-3 lg:block">
          <SidebarNav base={base} isActive={isActive} visible={visible} />
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-8">
          <div key={pathname} className="animate-in mx-auto max-w-3xl p-4">{children}</div>
        </main>
      </div>

      {/* Drawer mobile — menu lengkap berkategori (§6). */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Tutup menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="truncate font-semibold text-primary">{tenantNama}</span>
              <button onClick={() => setDrawer(false)} aria-label="Tutup" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav base={base} isActive={isActive} visible={visible} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Bottom nav mobile: menu tersering + "Lainnya" (§4). */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface lg:hidden" aria-label="Navigasi utama">
        {primary.map((item) => (
          <a
            key={item.href}
            href={`${base}${item.href}`}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${isActive(item.href) ? "text-primary" : "text-muted"}`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </a>
        ))}
        <button
          onClick={() => setDrawer(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${overflow.some((i) => isActive(i.href)) ? "text-primary" : "text-muted"}`}
        >
          <MoreHorizontal className="h-5 w-5" />
          Lainnya
        </button>
      </nav>
    </div>
  );
}

function SidebarNav({
  base,
  isActive,
  visible,
  onNavigate,
}: {
  base: string;
  isActive: (href: string) => boolean;
  visible: (i: { ketuaOnly?: boolean }) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-4">
      {NAV_GROUPS.map((group, gi) => {
        const items = group.items.filter(visible);
        if (items.length === 0) return null;
        return (
          <div key={gi}>
            {group.label && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.label}</p>}
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={`${base}${item.href}`}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive(item.href) ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-primary/10"
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
