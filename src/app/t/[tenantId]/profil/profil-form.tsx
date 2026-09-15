"use client";

import { useActionState, useState } from "react";
import { validasiFileGambar } from "@/lib/validasi-file";
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
        <input name="nama" defaultValue={profile.nama} required className="w-full rounded-md border border-primary/30 p-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Alamat</label>
        <textarea name="alamat" defaultValue={profile.alamat ?? ""} className="w-full rounded-md border border-primary/30 p-2 text-sm" />
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
      <button
        type="submit"
        disabled={pending || !!fileError}
        className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
