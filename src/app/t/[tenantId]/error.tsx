"use client";

import { AlertTriangle } from "lucide-react";
import { Card, btnPrimary, btnGhost } from "@/components/ui";

/**
 * Tanpa ini, error dari server action (mis. validasi pasangan silsilah) tampil
 * sebagai stack trace mentah ke pengguna. Pesan error aplikasi sendiri sudah
 * berbahasa Indonesia, jadi ditampilkan apa adanya; error tak terduga cukup
 * ditampilkan sebagai pesan umum.
 */
export default function TenantError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pesanKita = error.message && !/^\w*Error:|invocation|prisma|\n/i.test(error.message) ? error.message : null;

  return (
    <div className="mx-auto max-w-lg p-4">
      <Card className="border-danger/30 bg-danger/5">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-5 w-5 text-danger" />
          {pesanKita ? "Tidak bisa diproses" : "Terjadi kesalahan"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {pesanKita ?? "Sistem gagal memproses permintaan ini. Coba lagi, atau hubungi pengurus kalau terus berulang."}
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={reset} className={btnPrimary}>
            Coba Lagi
          </button>
          <a href="/dashboard" className={btnGhost}>
            Ke Dashboard
          </a>
        </div>
      </Card>
    </div>
  );
}
