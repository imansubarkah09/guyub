"use client";

import { useActionState, useState } from "react";
import { Card, btnPrimary, inputClass } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { validasiFileGambar } from "@/lib/validasi-file";
import { hariIniWIB } from "@/lib/waktu";
import { catatKegiatanAction } from "./actions";
import { SumberFields, type Pool } from "./sumber-fields";

export function KegiatanForm({ tenantId, pools }: { tenantId: string; pools: Pool[] }) {
  const [state, formAction, pending] = useActionState(catatKegiatanAction, null);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Catat Kegiatan</h2>
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input name="namaKegiatan" required placeholder="Nama kegiatan, misal: Santunan Anak Yatim 2026" className={inputClass} />
        <div className="flex gap-2">
          <InputRupiah name="targetDana" placeholder="Target dana (Rp, opsional)" className={inputClass} />
          <input type="date" name="tanggal" required defaultValue={hariIniWIB()} className={inputClass} />
        </div>
        <SumberFields pools={pools} />
        <input name="keterangan" placeholder="Keterangan (opsional)" className={inputClass} />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Bukti (opsional)</label>
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
          {pending ? "Menyimpan..." : "Simpan Kegiatan"}
        </button>
      </form>
    </Card>
  );
}
