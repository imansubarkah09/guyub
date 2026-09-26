"use client";

import { useActionState, useState } from "react";
import { validasiFileGambar } from "@/lib/validasi-file";
import { btnPrimary, inputClass } from "@/components/ui";
import { updateProfilAction } from "./actions";

type Profile = { nama: string; alamat: string | null; logoUrl: string | null };

export function ProfilForm({ tenantId, profile }: { tenantId: string; profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfilAction, null);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      {profile.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.logoUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
      )}
      <div>
        <label className="mb-1 block text-xs font-medium">Nama Tenant</label>
        <input name="nama" defaultValue={profile.nama} required className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Alamat</label>
        <textarea name="alamat" defaultValue={profile.alamat ?? ""} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Logo</label>
        <input
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm"
          onChange={(e) => setFileError(e.target.files?.[0] ? validasiFileGambar(e.target.files[0]) : null)}
        />
      </div>
      {(fileError ?? state?.error) && <p className="text-xs text-danger">{fileError ?? state?.error}</p>}
      <button type="submit" disabled={pending || !!fileError} className={`${btnPrimary} w-full`}>
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
