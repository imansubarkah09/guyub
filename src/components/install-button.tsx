"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { btnGhost } from "@/components/ui";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Tombol Install PWA (§7.14). Chrome/Android menembak `beforeinstallprompt`, event-nya
 * disimpan lalu dipakai saat tombol diklik. iOS Safari tidak pernah menembak event itu,
 * jadi di sana ditampilkan instruksi manual sebagai fallback.
 */
export function InstallButton() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (!deferred && !isIos) return null;

  return (
    <div className="w-full">
      <button
        type="button"
        className={`${btnGhost} w-full`}
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          } else {
            setShowIosHint((v) => !v);
          }
        }}
      >
        <Download className="h-4 w-4" />
        Install Aplikasi
      </button>
      {showIosHint && <p className="mt-1 text-xs text-muted">Di iPhone: tap tombol Share → &quot;Add to Home Screen&quot;.</p>}
    </div>
  );
}
