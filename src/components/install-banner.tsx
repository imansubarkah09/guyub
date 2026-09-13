"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { btnPrimary, btnGhost } from "@/components/ui";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KUNCI = "guyub-install-tunda";
const TUNDA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Banner install PWA. Chrome/Android menembak `beforeinstallprompt`; banner baru
 * muncul sesudah event itu, jadi localStorage dibaca di handler, bukan saat render
 * (kalau dibaca saat render, server dan klien beda hasil dan hidrasi berantah).
 *
 * "Ingatkan Nanti" menyimpan waktu tunda, bukan "jangan tampilkan lagi": kalau
 * mau install sekarang juga, tombolnya tetap ada di menu profil (InstallButton).
 *
 * Sudah terinstall? Tidak perlu deteksi sendiri. Chrome TIDAK menembak
 * `beforeinstallprompt` selama aplikasinya masih terpasang (termasuk waktu
 * situsnya dibuka di tab browser biasa), dan menembaknya lagi sesudah di-uninstall,
 * jadi banner ini hilang dan muncul kembali mengikuti status pasang itu sendiri.
 * Satu-satunya yang ditambahkan: penjagaan display-mode standalone, untuk kasus
 * eventnya terlanjur tertembak sebelum pemasangan selesai di jendela yang sama.
 * iOS sengaja tidak ditangani di sini — Safari tidak punya event ini, dan
 * instruksi manualnya sudah ada di menu profil.
 */
export function InstallBanner() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (window.matchMedia("(display-mode: standalone)").matches) return;
      const tunda = Number(localStorage.getItem(KUNCI) ?? 0);
      if (Date.now() < tunda) return;
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setDeferred(null));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  return (
    // bottom-16 di layar kecil: bottom nav tenant (fixed bottom-0 z-40) tidak boleh tertutup.
    <div className="pb-safe fixed inset-x-3 bottom-16 z-50 rounded-xl border border-border bg-surface p-3 shadow-lg lg:inset-x-auto lg:right-4 lg:bottom-4 lg:w-80">
      <p className="text-sm font-medium">Install Guyub ke perangkat</p>
      <p className="mt-0.5 text-xs text-muted">Buka langsung dari layar utama, tanpa lewat browser.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={`${btnPrimary} flex-1`}
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
        >
          <Download className="h-4 w-4" />
          Install
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            localStorage.setItem(KUNCI, String(Date.now() + TUNDA_MS));
            setDeferred(null);
          }}
        >
          Ingatkan Nanti
        </button>
      </div>
    </div>
  );
}
