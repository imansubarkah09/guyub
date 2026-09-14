"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { inputClass, btnGhost, rupiah } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";

export type Pool = { value: string; label: string; saldo: number };

/**
 * Baris sumber dana bisa ditambah sesuai kebutuhan (mis. 500rb kas + 100rb infaq
 * + 1,4jt donasi). Dikirim sebagai dua array sejajar: sumber[] & jumlahSumber[].
 */
export function SumberFields({ pools }: { pools: Pool[] }) {
  const [baris, setBaris] = useState([{ id: 1 }]);
  const [nextId, setNextId] = useState(2);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted">Sumber dana (boleh lebih dari satu)</label>
      {baris.map((b, i) => (
        <div key={b.id} className="flex gap-2">
          <select name="sumber" required className={inputClass} defaultValue={pools[0]?.value}>
            {pools.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
                {p.value !== "donasi" ? ` — ${rupiah.format(p.saldo)}` : ""}
              </option>
            ))}
          </select>
          <InputRupiah name="jumlahSumber" placeholder="Jumlah (Rp)" className={inputClass} required />
          {baris.length > 1 && (
            <button type="button" onClick={() => setBaris(baris.filter((x) => x.id !== b.id))} aria-label={`Hapus sumber ${i + 1}`} className="rounded-lg border border-border px-2">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          setBaris([...baris, { id: nextId }]);
          setNextId(nextId + 1);
        }}
        className={`${btnGhost} w-full`}
      >
        <Plus className="h-4 w-4" /> Tambah Sumber Dana
      </button>
    </div>
  );
}
