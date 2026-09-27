"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal, X, Eye } from "lucide-react";
import { GuyubLogo } from "@/components/guyub-logo";
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
  // Drawer diikat ke lokasi saat dibuka, jadi otomatis tertutup begitu pindah
  // halaman lewat tautan mana pun di dalamnya (lonceng, menu akun), bukan cuma
  // menu navigasi yang punya onNavigate (ketemu uji inbox 27 Sep 2026).
  const lokasi = `${pathname}?${useSearchParams().toString()}`;
  const [drawerDi, setDrawerDi] = useState<string | null>(null);
  const drawer = drawerDi === lokasi;
  const setDrawer = (buka: boolean) => setDrawerDi(buka ? lokasi : null);
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

      {/* Top bar di semua lebar (permintaan Iman 27 Sep 2026, membalik versi
          "tanpa header di HP" sehari sebelumnya): logo + Guyub, lonceng, avatar.
          pt-safe di header itu sendiri (baris h-14 di dalamnya), bukan di
          wrapper, supaya saat di-scroll header sticky tetap di bawah notch.
          Sengaja tanpa backdrop-blur: backdrop-filter menjadikan header wadah
          elemen fixed di dalamnya, jadi lapisan "klik di luar untuk menutup"
          milik lonceng/menu akun cuma selebar header dan klik di luar tidak menutup. */}
      <header className="pt-safe sticky top-0 z-40 border-b border-border bg-surface">
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Logo ke halaman pilih tenant: dari dalam tenant dulu tidak ada jalan ke sana. */}
            <Link href="/dashboard" className="flex flex-shrink-0 items-center gap-2 px-1" aria-label="Guyub, pilih tenant">
              <GuyubLogo className="h-7 w-7" />
              <span className="font-semibold tracking-tight text-primary">Guyub</span>
            </Link>
            <Link href={base} className="hidden min-w-0 truncate border-l border-border pl-2 text-sm text-muted hover:text-foreground lg:block">
              {tenantNama}
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <NotifBell items={notif} unread={unread} inboxHref={`${base}/notifikasi`} />
            <ProfileMenu user={account} />
          </div>
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
          <div className="pt-safe absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface p-3 shadow-xl">
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
          <Link
            key={item.href}
            href={`${base}${item.href}`}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${isActive(item.href) ? "text-primary" : "text-muted"}`}
          >
            <item.icon className="h-5 w-5" />
            {item.short ?? item.label}
          </Link>
        ))}
        <button
          onClick={() => setDrawer(true)}
          aria-current={overflow.some((i) => isActive(i.href)) ? "true" : undefined}
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
                  <Link
                    href={`${base}${item.href}`}
                    onClick={onNavigate}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    // prefetch={false}: sidebar memuat 10+ tautan sekaligus dan tiap
                    // halaman tenant menembak DB. Prefetch bawaan berarti belasan render
                    // SSR cuma karena menu terlihat. Transisi client-side sendiri sudah
                    // membuang reload dokumen penuh, itu bagian terbesar dari lambatnya.
                    prefetch={false}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive(item.href) ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-primary/10"
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
