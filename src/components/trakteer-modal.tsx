"use client";

import { useEffect, useState } from "react";
import { Heart, Copy, Check } from "lucide-react";
import { btnPrimary, btnGhost } from "@/components/ui";

const TRAKTEER_ORIGIN = "https://trakteer.id";

/**
 * Overlay Trakteer, meniru perilaku skrip resmi mereka (trbtn-overlay.min.js):
 * iframe fixed 100%x100% + postMessage `embed.openModal` untuk membukanya, dan
 * menutup saat menerima `embed.modalClosed`. Skrip resminya tidak dipakai karena
 * memasang tombol lewat indeks tag <script>, yang bergeser di React.
 *
 * Sebelum overlay dibuka, kode tenant ditampilkan dulu: Trakteer tidak mengirim
 * "ini untuk tenant mana", jadi donatur perlu menempelkan kode itu di pesan
 * dukungan supaya webhook bisa menambah nyawa ke tenant yang benar.
 */
export function TrakteerModal({ modalUrl, kodeDonasi, namaTenant }: { modalUrl: string; kodeDonasi: string; namaTenant: string }) {
  const [tahap, setTahap] = useState<"tutup" | "kode" | "overlay">("tutup");
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TRAKTEER_ORIGIN) return;
      if ((e.data as { type?: string } | null)?.type === "embed.modalClosed") setTahap("tutup");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (tahap === "tutup") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTahap("tutup");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tahap]);

  return (
    <>
      <button onClick={() => setTahap("kode")} className={`${btnPrimary} w-full`}>
        <Heart className="h-4 w-4" /> Dukung Tenant Ini
      </button>

      {tahap === "kode" && (
        <div className="fixed inset-0 z-[9999998] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-[var(--radius)] bg-surface p-4 shadow-xl">
            <p className="font-semibold">Dukung {namaTenant}</p>
            <p className="mt-1 text-sm text-muted">
              Salin kode di bawah, lalu <strong>tempelkan di kolom pesan dukungan</strong> saat traktir. Kode ini yang membuat donasi Anda menambah masa aktif tenant ini.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-lg tracking-widest">{kodeDonasi}</code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(kodeDonasi).then(() => {
                    setTersalin(true);
                    window.setTimeout(() => setTersalin(false), 2000);
                  });
                }}
                className={btnGhost}
                aria-label="Salin kode"
              >
                {tersalin ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setTahap("overlay")} className={`${btnPrimary} flex-1`}>
                Lanjut ke Trakteer
              </button>
              <button onClick={() => setTahap("tutup")} className={btnGhost}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {tahap === "overlay" && (
        <div className="fixed inset-0 z-[9999999]" role="dialog" aria-modal="true" aria-label="Dukung lewat Trakteer">
          <iframe
            src={`${modalUrl}?ref=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.href)}`}
            title="Dukung lewat Trakteer"
            className="h-full w-full border-0"
            onLoad={(e) => e.currentTarget.contentWindow?.postMessage({ type: "embed.openModal" }, TRAKTEER_ORIGIN)}
          />
        </div>
      )}
    </>
  );
}
