"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { tandaiSemuaDibacaAction } from "@/app/account-actions";

export type NotifItem = { id: string; pesan: string; href: string | null; isRead: boolean; createdAt: string };

/**
 * Membuka lonceng TIDAK lagi menandai apa pun dibaca (27 Sep 2026, pola inbox
 * Novelis/Brokado): klik item membuka item itu di inbox, dan di sanalah ia
 * ditandai dibaca. inline: di dalam drawer mobile, lihat alasan di ProfileMenu.
 */
export function NotifBell({ items, unread, inboxHref, inline = false }: { items: NotifItem[]; unread: number; inboxHref: string; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  // Optimistis diikat ke angka unread saat tombol diklik: begitu data server
  // berubah (sudah revalidate, atau ada notifikasi baru), flag ini gugur sendiri.
  const [dibacaSaat, setDibacaSaat] = useState<number | null>(null);
  const semuaDibaca = dibacaSaat === unread;
  const belum = semuaDibaca ? 0 : unread;

  const badge = belum > 0 && (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{belum > 9 ? "9+" : belum}</span>
  );

  return (
    <div className={inline ? "w-full" : "relative"}>
      {inline ? (
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-primary/10">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
            <Bell className="h-5 w-5" />
          </span>
          <span className="flex-1 font-medium">Notifikasi</span>
          {badge}
        </button>
      ) : (
        <button onClick={() => setOpen((v) => !v)} aria-label="Notifikasi" className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-primary/10">
          <Bell className="h-5 w-5" />
          {badge && <span className="absolute -right-0.5 -top-0.5">{badge}</span>}
        </button>
      )}

      {open && (
        <>
          {!inline && <button aria-label="Tutup" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />}
          <div
            className={
              inline
                ? "mt-2 overflow-hidden rounded-[var(--radius)] border border-border bg-surface"
                : "absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-lg"
            }
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notifikasi</p>
              {belum > 0 && (
                <button
                  onClick={() => {
                    setDibacaSaat(unread);
                    tandaiSemuaDibacaAction();
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted">Belum ada notifikasi.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map((n) => {
                  const baru = !n.isRead && !semuaDibaca;
                  return (
                    <li key={n.id}>
                      <Link
                        href={`${inboxHref}?id=${n.id}`}
                        prefetch={false}
                        onClick={() => setOpen(false)}
                        className={`flex gap-2 border-b border-border px-3 py-2.5 text-sm transition hover:bg-primary/5 ${baru ? "bg-primary/5" : ""}`}
                      >
                        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${baru ? "bg-primary" : "bg-transparent"}`} />
                        <span className="min-w-0">
                          <span className={`line-clamp-2 break-words ${baru ? "font-semibold" : ""}`}>{n.pesan}</span>
                          <span className="mt-0.5 block text-xs text-muted">{n.createdAt}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href={inboxHref}
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
            >
              Lihat semua notifikasi
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
