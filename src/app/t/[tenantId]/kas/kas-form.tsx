"use client";

import { useActionState, useState } from "react";
import { Card, btnPrimary, inputClass } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { validasiFileGambar } from "@/lib/validasi-file";
import { hariIniWIB } from "@/lib/waktu";
import { createKasTransaksiAction } from "./actions";

export function KasForm({ tenantId }: { tenantId: string }) {
  const [state, formAction, pending] = useActionState(createKasTransaksiAction, null);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Catat Transaksi</h2>
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <div className="flex gap-2">
          <input type="date" name="tanggal" required defaultValue={hariIniWIB()} className={inputClass} />
          <select name="tipe" required className={inputClass}>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
        <InputRupiah name="jumlah" placeholder="Jumlah (Rp)" className={inputClass} required />
        <input name="keterangan" placeholder="Keterangan" className={inputClass} />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Bukti transfer (opsional)</label>
          <input
            type="file"
            name="bukti"
            accept="image/jpeg,image/png,image/webp"
            className="w-full text-xs"
            onChange={(e) => setFileError(e.target.files?.[0] ? validasiFileGambar(e.target.files[0]) : null)}
          />
        </div>
        {(fileError ?? state?.error) && <p className="text-xs text-danger">{fileError ?? state?.error}</p>}
        <button type="submit" disabled={pending || !!fileError} className={`${btnPrimary} w-full disabled:opacity-50`}>
          {pending ? "Menyimpan..." : "Catat Transaksi"}
        </button>
      </form>
    </Card>
  );
}
