"use client";

import { useActionState, useState } from "react";
import { btnGhost, inputClass } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { validasiFileGambar } from "@/lib/validasi-file";
import { submitSetoranBuktiAction } from "./actions";

export function SetoranBuktiForm({ tenantId, tabunganTipeId }: { tenantId: string; tabunganTipeId: string }) {
  const [state, formAction, pending] = useActionState(submitSetoranBuktiAction, null);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-2 min-[420px]:flex-row">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="tabunganTipeId" value={tabunganTipeId} />
        <InputRupiah name="jumlah" placeholder="Jumlah (Rp)" className={inputClass} required />
        <input
          type="file"
          name="bukti"
          accept="image/jpeg,image/png,image/webp"
          required
          className="flex-1 text-xs"
          onChange={(e) => setFileError(e.target.files?.[0] ? validasiFileGambar(e.target.files[0]) : null)}
        />
        <button disabled={pending || !!fileError} className={`${btnGhost} disabled:opacity-50`}>
          {pending ? "Mengunggah..." : "Ajukan"}
        </button>
      </form>
      {(fileError ?? state?.error) && <p className="mt-1 text-xs text-danger">{fileError ?? state?.error}</p>}
    </div>
  );
}
