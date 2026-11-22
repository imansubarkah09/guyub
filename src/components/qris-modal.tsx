"use client";

import { useEffect, useState } from "react";
import { Heart, Download } from "lucide-react";
import { btnPrimary, btnGhost } from "@/components/ui";

const QRIS_IMAGE = "/qris-code-the-dream-company.jpeg";

/** Dialog QRIS The Dream Company, murni gambar statis (tanpa validasi otomatis), pola yang sama dengan School Community. */
export function QrisModal({ label = "Dukung KOMUNITA", className }: { label?: string; className?: string }) {
  const [buka, setBuka] = useState(false);

  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buka]);

  return (
    <>
      <button onClick={() => setBuka(true)} className={className ?? `${btnPrimary} w-full`}>
        <Heart className="h-4 w-4" /> {label}
      </button>

      {buka && (
        <div className="fixed inset-0 z-[9999998] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Dukung KOMUNITA">
          <div className="w-full max-w-sm rounded-[var(--radius)] bg-surface p-4 shadow-xl">
            <p className="font-semibold">Dukung KOMUNITA</p>
            <p className="mt-1 text-sm text-muted">Scan kode QRIS di bawah ini lewat aplikasi e-wallet atau m-banking Anda untuk memberi dukungan.</p>
            <div className="mt-3 flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={QRIS_IMAGE} alt="Kode QRIS The Dream Company" className="w-full max-w-[280px] rounded-md border border-border" />
              <a href={QRIS_IMAGE} download="qris-komunita.jpeg" className={`${btnGhost} w-full justify-center`}>
                <Download className="h-4 w-4" /> Unduh QRIS
              </a>
              <button onClick={() => setBuka(false)} className={`${btnGhost} w-full justify-center`}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
