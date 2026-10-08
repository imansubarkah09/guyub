"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { btnPrimary, btnGhost } from "@/components/ui";

const VERSI_INI = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const KUNCI_TUTUP = "guyub-update-ditutup";
const CEK_MS = 2 * 60_000;

/**
 * Banner "versi baru tersedia", meniru toast update Lab Saya. PWA tidak punya tombol
 * reload, jadi tanpa ini pengguna bisa berhari-hari memakai kode lama. Versi tab ini
 * (ditanam saat build) dibandingkan dengan /api/version tiap 2 menit dan setiap
 * aplikasi kembali dibuka ke layar. "Nanti" = tidak muncul lagi untuk versi itu di tab ini.
 */
export function UpdateBanner() {
  const [versiBaru, setVersiBaru] = useState<string | null>(null);

  useEffect(() => {
    if (VERSI_INI === "dev") return;
    let berhenti = false;
    const cek = async () => {
      if (berhenti || document.visibilityState !== "visible") return;
      const data = (await fetch("/api/version", { cache: "no-store" }).then(
        (r) => r.json(),
        () => null,
      )) as { build?: string } | null;
      if (berhenti || !data?.build || data.build === "dev" || data.build === VERSI_INI) return;
      try {
        if (sessionStorage.getItem(KUNCI_TUTUP) === data.build) return;
      } catch {}
      setVersiBaru(data.build);
    };
    cek();
    const timer = setInterval(cek, CEK_MS);
    document.addEventListener("visibilitychange", cek);
    return () => {
      berhenti = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", cek);
    };
  }, []);

  if (!versiBaru) return null;

  return (
    // Di atas, bukan di bawah: bawah layar sudah dipakai bottom nav dan banner install.
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] rounded-xl border-2 border-primary bg-surface p-3 shadow-lg lg:inset-x-auto lg:right-4 lg:w-80"
    >
      <p className="text-sm font-medium">Guyub versi baru sudah tersedia</p>
      <p className="mt-0.5 text-xs text-muted">Muat ulang supaya perbaikan dan fitur terbaru langsung terpakai.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={`${btnPrimary} flex-1`} onClick={() => location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Muat ulang sekarang
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            try {
              sessionStorage.setItem(KUNCI_TUTUP, versiBaru);
            } catch {}
            setVersiBaru(null);
          }}
        >
          Nanti
        </button>
      </div>
    </div>
  );
}
