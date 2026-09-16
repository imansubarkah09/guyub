"use client";

import { useState } from "react";
import { FileDown, MessageCircle, Share2 } from "lucide-react";
import { createLaporanAction } from "./actions";
import { Card, Badge, btnPrimary, btnGhost, inputClass, rupiah } from "@/components/ui";

export type TabData = {
  id: string;
  label: string;
  ringkas: { label: string; value: number }[];
  rows: { kolom: string[] }[];
  header: string[];
};

export function LaporanTabs({
  tenantId,
  tenantNama,
  tabs,
  canGenerate,
  baseUrl,
}: {
  tenantId: string;
  tenantNama: string;
  tabs: TabData[];
  canGenerate: boolean;
  baseUrl: string;
}) {
  const [aktif, setAktif] = useState(tabs[0]?.id ?? "");
  const [periode, setPeriode] = useState(new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }));
  const [busy, setBusy] = useState(false);
  const [publishedLink, setPublishedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tab = tabs.find((t) => t.id === aktif) ?? tabs[0];

  async function buatPdf(gabungan: boolean) {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Laporan ${tenantNama}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Periode: ${periode}`, 14, 23);

    let y = 30;
    for (const t of gabungan ? tabs : [tab]) {
      doc.setFontSize(11);
      doc.text(t.label, 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [t.header],
        body: t.rows.map((r) => r.kolom),
        foot: [t.ringkas.map((s) => `${s.label}: ${rupiah.format(s.value)}`).slice(0, t.header.length)],
        styles: { fontSize: 8 },
      });
      // @ts-expect-error lastAutoTable disisipkan plugin autotable saat runtime
      y = (doc.lastAutoTable?.finalY ?? y + 30) + 10;
      if (y > 250 && gabungan) {
        doc.addPage();
        y = 20;
      }
    }
    return doc;
  }

  /** Redirect dari requireUser() (sesi habis) dilempar sebagai error khusus Next, harus diteruskan, bukan ditelan. */
  function isRedirectError(err: unknown): boolean {
    return typeof err === "object" && err !== null && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT");
  }

  async function unduhPdf(gabungan: boolean) {
    setBusy(true);
    setError(null);
    try {
      const doc = await buatPdf(gabungan);
      doc.save(`laporan-${periode.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Gagal membuat PDF, coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const doc = await buatPdf(true);
      // jsPDF menyisipkan `;filename=generated.pdf` di data URI, dan Cloudinary
      // menolaknya ("Unsupported source URL") — dibuang dulu sebelum diunggah.
      const dataUri = doc.output("datauristring").replace(/;filename=[^;]*/, "");
      const link = await createLaporanAction(tenantId, periode, dataUri);
      setPublishedLink(`${baseUrl}/laporan/${link}`);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Gagal menerbitkan laporan, coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const waPengurus = publishedLink
    ? `*Laporan ${tenantNama}* (${periode})%0A%0ARingkasan untuk pengurus:%0A${tabs
        .map((t) => `- ${t.label}: ${t.ringkas.map((s) => `${s.label} ${rupiah.format(s.value)}`).join(", ")}`)
        .join("%0A")}%0A%0ADetail: ${publishedLink}`
    : "";
  const waWarga = publishedLink
    ? `*Laporan Keuangan ${tenantNama}* (${periode})%0A%0ALaporan ringkas periode ini sudah terbit. Silakan lihat di:%0A${publishedLink}`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setAktif(t.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              t.id === tab?.id ? "bg-primary text-primary-foreground" : "border border-border text-muted hover:bg-primary/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab && (
        <Card>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {tab.ringkas.map((s) => (
              <div key={s.label}>
                <p className="text-xs text-muted">{s.label}</p>
                <p className="text-lg font-semibold tabular-nums">{rupiah.format(s.value)}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  {tab.header.map((h) => (
                    <th key={h} className="px-2 py-1.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tab.rows.length === 0 ? (
                  <tr>
                    <td colSpan={tab.header.length} className="px-2 py-4 text-center text-muted">
                      Belum ada data untuk tab ini.
                    </td>
                  </tr>
                ) : (
                  tab.rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/60">
                      {r.kolom.map((c, j) => (
                        <td key={j} className="px-2 py-1.5">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {canGenerate && (
        <Card className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Periode laporan</label>
            <input value={periode} onChange={(e) => setPeriode(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => unduhPdf(false)} disabled={busy} className={btnGhost}>
              <FileDown className="h-4 w-4" /> PDF tab ini
            </button>
            <button onClick={() => unduhPdf(true)} disabled={busy} className={btnGhost}>
              <FileDown className="h-4 w-4" /> PDF semua tab
            </button>
            <button onClick={publish} disabled={busy} className={btnPrimary}>
              <Share2 className="h-4 w-4" /> {busy ? "Memproses…" : "Terbitkan & Bagikan"}
            </button>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          {publishedLink && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs text-muted">
                <Badge tone="success">Terbit</Badge> Link publik hanya menampilkan ringkasan uang masuk & keluar, tanpa nama anggota atau detail transaksi.
              </p>
              <input readOnly value={publishedLink} className={`${inputClass} text-xs`} />
              <div className="flex flex-wrap gap-2">
                <a href={`https://wa.me/?text=${waPengurus}`} target="_blank" rel="noreferrer" className={`${btnGhost} text-success`}>
                  <MessageCircle className="h-4 w-4" /> Grup Pengurus
                </a>
                <a href={`https://wa.me/?text=${waWarga}`} target="_blank" rel="noreferrer" className={`${btnGhost} text-success`}>
                  <MessageCircle className="h-4 w-4" /> Grup Keluarga/RT
                </a>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
