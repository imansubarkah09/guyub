"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { markNotifReadAction } from "@/app/account-actions";

export type NotifItem = { id: string; pesan: string; href: string | null; isRead: boolean; createdAt: string };

export function NotifBell({ items, unread }: { items: NotifItem[]; unread: number }) {
  const [open, setOpen] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Dibuka = dianggap dibaca (§7.12), history-nya tetap tersimpan di DB.
    if (next && unread > 0) markNotifReadAction();
  }

  return (
    <div className="relative">
      <button onClick={toggle} aria-label="Notifikasi" className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-primary/10">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button aria-label="Tutup" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-lg">
            <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Notifikasi</p>
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted">Belum ada notifikasi.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.href ?? "#"}
                      onClick={() => setOpen(false)}
                      className={`block border-b border-border px-3 py-2.5 text-sm transition hover:bg-primary/5 ${n.isRead ? "" : "bg-primary/5"}`}
                    >
                      <span className="block">{n.pesan}</span>
                      <span className="mt-0.5 block text-xs text-muted">{n.createdAt}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
