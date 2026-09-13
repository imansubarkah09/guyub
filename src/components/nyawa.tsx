"use client";

import { useState } from "react";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Badge, rupiah } from "@/components/ui";

export type Donatur = { id: string; nama: string; jumlah: number; hari: number; tanggal: string };

/**
 * "Termometer air raksa dibaringkan" — indikator masa aktif tenant. Skala
 * dipatok 365 hari supaya satu tahun terisi penuh; lebih dari itu tetap 100%.
 */
export function NyawaBar({ sisaHari, sampai }: { sisaHari: number; sampai: string | null }) {
  const persen = Math.min(100, (sisaHari / 365) * 100);
  const tone = sisaHari === 0 ? "bg-danger" : sisaHari < 14 ? "bg-warning" : "bg-success";
  const label =
    sisaHari === 0
      ? "Masa aktif habis"
      : sisaHari < 60
        ? `${sisaHari} hari lagi`
        : sisaHari < 365
          ? `${Math.floor(sisaHari / 30)} bulan lagi`
          : `${(sisaHari / 365).toFixed(1)} tahun lagi`;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-transparent">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <Activity className="h-4 w-4 text-primary" /> Nyawa Platform
        </p>
        <Badge tone={sisaHari === 0 ? "danger" : sisaHari < 14 ? "warning" : "success"}>{label}</Badge>
      </div>

      {/* Tabung termometer: kapsul memanjang + "bulb" di ujung kiri. */}
      <div className="flex items-center gap-2">
        <span className={`h-5 w-5 flex-shrink-0 rounded-full ${tone}`} />
        <div className="h-5 flex-1 overflow-hidden rounded-full border border-border bg-border/40">
          <div className={`h-full rounded-full ${tone} transition-[width] duration-700`} style={{ width: `${Math.max(persen, sisaHari > 0 ? 4 : 0)}%` }} />
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        {sampai ? `Tenant ini aktif sampai ${sampai}.` : "Belum pernah didukung — dukung lewat Trakteer untuk menambah masa aktif."} Setiap traktiran menambah
        nyawa untuk seluruh anggota tenant.
      </p>
    </Card>
  );
}

/** Dua daftar donatur berdampingan, masing-masing 5 baris per halaman. */
export function DonaturList({ judul, items, urut }: { judul: string; items: Donatur[]; urut: "terbaru" | "terbesar" }) {
  const [hal, setHal] = useState(0);
  const perHal = 5;
  const maxHal = Math.max(1, Math.ceil(items.length / perHal));
  const tampil = items.slice(hal * perHal, hal * perHal + perHal);

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{judul}</p>
        {items.length > perHal && (
          <span className="flex items-center gap-1">
            <button onClick={() => setHal((h) => Math.max(0, h - 1))} disabled={hal === 0} aria-label="Sebelumnya" className="rounded border border-border p-0.5 disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-muted">
              {hal + 1}/{maxHal}
            </span>
            <button
              onClick={() => setHal((h) => Math.min(maxHal - 1, h + 1))}
              disabled={hal >= maxHal - 1}
              aria-label="Berikutnya"
              className="rounded border border-border p-0.5 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted">Belum ada donatur.</p>
      ) : (
        <ul className="space-y-1.5">
          {tampil.map((d, i) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {urut === "terbesar" && hal === 0 && i === 0 && <Badge tone="primary">Top</Badge>}
                <span className="truncate">{d.nama}</span>
              </span>
              <span className="flex-shrink-0 text-right">
                <span className="block text-xs font-medium tabular-nums">{rupiah.format(d.jumlah)}</span>
                <span className="block text-[11px] text-muted">
                  +{d.hari} hari · {d.tanggal}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
