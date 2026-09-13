"use client";

import { useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { btnPrimary, btnGhost, rupiah } from "@/components/ui";
import { simpanUndianAction } from "./actions";

export type Slot = { id: string; label: string };

const WARNA = ["#c1652d", "#0f766e", "#b45309", "#15803d", "#7c3aed", "#be123c", "#0369a1", "#a16207"];

/**
 * Roda undian arisan. Pemenang dipilih di KLIEN hanya untuk animasi; yang
 * menentukan sah-tidaknya tetap server (simpanUndianAction menolak slot yang
 * sudah dapat). Roda memakai viewBox sehingga ikut mengecil di layar HP.
 */
export function SpinWheel({
  tenantId,
  arisanId,
  slots,
  pemenangPerPutaran,
  potBersih,
  bisaKocok,
}: {
  tenantId: string;
  arisanId: string;
  slots: Slot[];
  pemenangPerPutaran: number;
  potBersih: number;
  bisaKocok: boolean;
}) {
  const [rotasi, setRotasi] = useState(0);
  const [berputar, setBerputar] = useState(false);
  const [pemenang, setPemenang] = useState<Slot[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const n = slots.length;
  const sudut = n > 0 ? 360 / n : 360;

  function kocok() {
    if (berputar || n === 0) return;
    setBerputar(true);
    setPemenang([]);

    // Undi tanpa pengulangan kalau pemenang per putaran lebih dari satu.
    const sisa = [...slots];
    const terpilih: Slot[] = [];
    for (let i = 0; i < Math.min(pemenangPerPutaran, sisa.length); i++) {
      terpilih.push(...sisa.splice(Math.floor(Math.random() * sisa.length), 1));
    }

    // Berhenti tepat di tengah irisan pemenang pertama, setelah 5 putaran penuh.
    const idx = slots.findIndex((s) => s.id === terpilih[0].id);
    const target = 360 * 5 + (360 - (idx * sudut + sudut / 2));
    setRotasi((r) => r + target);

    window.setTimeout(() => {
      setBerputar(false);
      setPemenang(terpilih);
    }, 4200);
  }

  if (n === 0) {
    return <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">Semua peserta sudah pernah dapat — tidak ada yang bisa dikocok.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-xs">
        {/* Penunjuk di atas roda */}
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
          <div className="h-0 w-0 border-x-8 border-t-[14px] border-x-transparent border-t-danger" />
        </div>
        <svg
          viewBox="0 0 200 200"
          className="w-full drop-shadow"
          style={{ transform: `rotate(${rotasi}deg)`, transition: berputar ? "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)" : "none" }}
        >
          {slots.map((s, i) => {
            const a0 = (i * sudut - 90) * (Math.PI / 180);
            const a1 = ((i + 1) * sudut - 90) * (Math.PI / 180);
            const x0 = 100 + 95 * Math.cos(a0);
            const y0 = 100 + 95 * Math.sin(a0);
            const x1 = 100 + 95 * Math.cos(a1);
            const y1 = 100 + 95 * Math.sin(a1);
            const besar = sudut > 180 ? 1 : 0;
            const tengah = (i * sudut + sudut / 2 - 90) * (Math.PI / 180);
            const tx = 100 + 62 * Math.cos(tengah);
            const ty = 100 + 62 * Math.sin(tengah);
            return (
              <g key={s.id}>
                <path
                  d={n === 1 ? "M100,5 A95,95 0 1,1 99.9,5 Z" : `M100,100 L${x0},${y0} A95,95 0 ${besar},1 ${x1},${y1} Z`}
                  fill={WARNA[i % WARNA.length]}
                  stroke="#fff"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  fill="#fff"
                  fontSize={n > 14 ? 5 : n > 8 ? 7 : 9}
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${i * sudut + sudut / 2} ${tx} ${ty})`}
                >
                  {s.label.length > 14 ? `${s.label.slice(0, 13)}…` : s.label}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="12" fill="#fff" stroke="#e5e7eb" />
        </svg>
      </div>

      {bisaKocok && (
        <button onClick={kocok} disabled={berputar} className={`${btnPrimary} w-full`}>
          <Play className="h-4 w-4" />
          {berputar ? "Mengocok…" : `Kocok Arisan${pemenangPerPutaran > 1 ? ` (${pemenangPerPutaran} nama)` : ""}`}
        </button>
      )}

      {pemenang.length > 0 && (
        <div className="rounded-[var(--radius)] border border-primary/30 bg-primary/5 p-3 text-center">
          <p className="text-xs text-muted">Hasil kocokan</p>
          <p className="text-lg font-semibold text-primary">{pemenang.map((p) => p.label).join(" & ")}</p>
          <p className="mt-1 text-xs text-muted">
            Masing-masing menerima {rupiah.format(potBersih / pemenang.length)} (setelah potongan)
          </p>
          <form ref={formRef} action={simpanUndianAction} className="mt-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:justify-center">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="arisanId" value={arisanId} />
            {pemenang.map((p) => (
              <input key={p.id} type="hidden" name="pesertaId" value={p.id} />
            ))}
            <button className={btnPrimary}>Simpan Hasil</button>
            <button type="button" onClick={() => setPemenang([])} className={btnGhost}>
              <RotateCcw className="h-4 w-4" /> Kocok Ulang
            </button>
          </form>
          <p className="mt-2 text-[11px] text-muted">
            Belum disimpan sampai Anda menekan &quot;Simpan Hasil&quot;. Kalau yang keluar tidak mau mengambil, cukup kocok ulang.
          </p>
        </div>
      )}
    </div>
  );
}
