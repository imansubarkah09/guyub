"use client";

import { useState } from "react";
import { createLaporanAction } from "./actions";

type KasRow = { tanggal: string; tipe: string; jumlah: number; keterangan: string };

export function GenerateLaporanButton({ tenantId, tenantNama, kas }: { tenantId: string; tenantNama: string; kas: KasRow[] }) {
  const [periode, setPeriode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    if (!periode.trim()) return;
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Laporan Kas — ${tenantNama}`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Periode: ${periode}`, 14, 23);
      const saldo = kas.reduce((acc, k) => acc + (k.tipe === "masuk" ? k.jumlah : -k.jumlah), 0);
      autoTable(doc, {
        startY: 28,
        head: [["Tanggal", "Tipe", "Jumlah", "Keterangan"]],
        body: kas.map((k) => [k.tanggal, k.tipe, k.jumlah.toLocaleString("id-ID"), k.keterangan]),
        foot: [["", "Saldo", saldo.toLocaleString("id-ID"), ""]],
      });
      const pdfDataUri = doc.output("datauristring");
      await createLaporanAction(tenantId, periode, pdfDataUri);
      setPeriode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2 rounded-md border border-primary/15 p-3">
      <input
        value={periode}
        onChange={(e) => setPeriode(e.target.value)}
        placeholder="Periode, misal: Januari 2026"
        className="flex-1 rounded-md border border-primary/30 p-2 text-sm"
      />
      <button onClick={handleGenerate} disabled={busy} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {busy ? "Membuat…" : "Buat Laporan"}
      </button>
    </div>
  );
}
