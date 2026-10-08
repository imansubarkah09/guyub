"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";
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
 * iPhone/iPad: Safari tidak punya event ini, jadi banner menampilkan panduan manual
 * (Bagikan, lalu Tambah ke Layar Utama), dengan aturan tunda yang sama. Di iOS
 * memasang ke Layar Utama juga syarat Web Push, jadi banner ini sekaligus jalan
 * menuju notifikasi.
 */
function perluPanduanIos() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const terpasang = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !terpasang && Date.now() >= Number(localStorage.getItem(KUNCI) ?? 0);
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ditutup, setDitutup] = useState(false);
  // useSyncExternalStore, bukan setState di effect: di server selalu false, jadi hidrasi aman.
  const panduanIos = useSyncExternalStore(
    () => () => {},
    perluPanduanIos,
    () => false,
  );

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

  const tunda = () => {
    localStorage.setItem(KUNCI, String(Date.now() + TUNDA_MS));
    setDeferred(null);
    setDitutup(true);
  };

  if (panduanIos && !ditutup) {
    return (
      <div className="pb-safe fixed inset-x-3 bottom-16 z-50 rounded-xl border border-border bg-surface p-3 shadow-lg lg:inset-x-auto lg:right-4 lg:bottom-4 lg:w-80">
        <p className="text-sm font-medium">Install Guyub ke iPhone</p>
        <p className="mt-0.5 text-xs text-muted">
          Tap tombol Bagikan <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Bagikan" /> di Safari, lalu pilih{" "}
          <span className="font-medium text-foreground">Tambah ke Layar Utama</span>. Notifikasi Guyub di iPhone hanya jalan dari aplikasi yang
          sudah terpasang.
        </p>
        <div className="mt-3 flex justify-end">
          <button type="button" className={btnGhost} onClick={tunda}>
            Ingatkan Nanti
          </button>
        </div>
      </div>
    );
  }

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
        <button type="button" className={btnGhost} onClick={tunda}>
          Ingatkan Nanti
        </button>
      </div>
    </div>
  );
}
