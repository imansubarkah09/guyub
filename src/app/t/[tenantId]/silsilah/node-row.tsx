"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateFamilyNodeAction, deleteFamilyNodeAction } from "./actions";

type Option = { id: string; nama: string };

/**
 * Tombol yang mati selagi kiriman berjalan. Di jaringan lambat, "Simpan" ditekan
 * dua kali mengirim dua perubahan pasangan yang saling balapan dan yang kedua
 * menabrak unique spouseId.
 */
function TombolKirim({ children, className, formAction, onClick }: {
  children: React.ReactNode;
  className: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} formAction={formAction} onClick={onClick} className={`${className} disabled:opacity-50`}>
      {pending ? "..." : children}
    </button>
  );
}
type Akun = { id: string; name: string; email: string };

export function NodeRow({
  tenantId,
  node,
  options,
  anggota,
}: {
  tenantId: string;
  node: { id: string; nama: string; parentId: string | null; spouseId: string | null; userId: string | null; urutan: number | null };
  options: Option[];
  anggota: Akun[];
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <span className="font-medium">
        {node.nama}{" "}
        <button onClick={() => setEditing(true)} className="text-xs font-normal text-primary underline">
          edit
        </button>
      </span>
    );
  }

  const pilihan = options.filter((o) => o.id !== node.id);

  return (
    <form
      action={async (formData) => {
        await updateFamilyNodeAction(formData);
        setEditing(false);
      }}
      className="inline-flex flex-wrap items-center gap-1 align-middle"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="nodeId" value={node.id} />
      <input name="nama" defaultValue={node.nama} required className="rounded border border-primary/30 p-1 text-xs" />
      <select name="parentId" defaultValue={node.parentId ?? ""} className="rounded border border-primary/30 p-1 text-xs">
        <option value="">Tanpa orang tua</option>
        {pilihan.map((o) => (
          <option key={o.id} value={o.id}>
            Anak dari {o.nama}
          </option>
        ))}
      </select>
      <input
        type="number"
        name="urutan"
        min={1}
        defaultValue={node.urutan ?? ""}
        placeholder="Anak ke-"
        className="w-24 rounded border border-primary/30 p-1 text-xs"
      />
      <select name="spouseId" defaultValue={node.spouseId ?? ""} className="rounded border border-primary/30 p-1 text-xs">
        <option value="">Tanpa pasangan</option>
        {pilihan.map((o) => (
          <option key={o.id} value={o.id}>
            Pasangan: {o.nama}
          </option>
        ))}
      </select>
      <select name="userId" defaultValue={node.userId ?? ""} className="rounded border border-primary/30 p-1 text-xs">
        <option value="">Tanpa akun</option>
        {anggota.map((a) => (
          <option key={a.id} value={a.id}>
            Akun: {a.name} ({a.email})
          </option>
        ))}
      </select>
      <TombolKirim className="rounded border border-primary/30 px-2 py-1 text-xs">Simpan</TombolKirim>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground/50">
        Batal
      </button>
      {/* formAction: tombol hapus ikut form yang sama, jadi tidak perlu form bersarang
          (HTML melarangnya). confirm() dipasang karena penghapusan tidak bisa dibatalkan. */}
      <TombolKirim
        formAction={deleteFamilyNodeAction}
        onClick={(e) => {
          if (!confirm(`Hapus "${node.nama}" dari silsilah? Anak-anaknya akan naik ke orang tua di atasnya.`)) e.preventDefault();
        }}
        className="text-xs text-danger underline"
      >
        Hapus
      </TombolKirim>
    </form>
  );
}
