"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound, ShieldCheck, Info } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { updateAccountAction } from "@/app/account-actions";
import { validasiFileGambar } from "@/lib/validasi-file";
import { InstallButton } from "@/components/install-button";
import { btnPrimary, inputClass } from "@/components/ui";

export type AccountInfo = { name: string; email: string; phone: string | null; image: string | null; isPlatformOwner: boolean };

export function ProfileMenu({ user }: { user: AccountInfo }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 transition hover:bg-primary/10" aria-label="Menu akun">
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.name}</span>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{initial}</span>
        )}
      </button>

      {open && (
        <>
          <button aria-label="Tutup" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius)] border border-border bg-surface p-3 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>

            <form
              action={async (fd) => {
                setSaving(true);
                setError(null);
                try {
                  const result = await updateAccountAction(fd);
                  if (result?.error) {
                    setError(result.error);
                  } else {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                  }
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-2"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Nama tampilan</label>
                <input name="name" defaultValue={user.name} required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Nomor WhatsApp</label>
                <input name="phone" defaultValue={user.phone ?? ""} placeholder="08xxxxxxxxxx" inputMode="tel" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Foto profil</label>
                <input
                  type="file"
                  name="avatar"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full text-xs"
                  onChange={(e) => setError(e.target.files?.[0] ? validasiFileGambar(e.target.files[0]) : null)}
                />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
                {saving ? "Menyimpan…" : saved ? "Tersimpan ✓" : "Simpan"}
              </button>
            </form>

            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <InstallButton />
              <Link href="/tentang" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-primary/5">
                <Info className="h-4 w-4 text-muted" />
                Tentang Guyub
              </Link>
              {user.isPlatformOwner && (
                <Link href="/admin" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-primary/5">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  Area Platform Owner
                </Link>
              )}
              <button
                onClick={() => signOut().then(() => router.push("/"))}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-danger transition hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
