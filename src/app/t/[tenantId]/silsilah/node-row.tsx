"use client";

import { useState } from "react";
import { updateFamilyNodeAction } from "./actions";

type Option = { id: string; nama: string };

export function NodeRow({
  tenantId,
  node,
  options,
}: {
  tenantId: string;
  node: { id: string; nama: string; parentId: string | null; spouseId: string | null };
  options: Option[];
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
      <select name="spouseId" defaultValue={node.spouseId ?? ""} className="rounded border border-primary/30 p-1 text-xs">
        <option value="">Tanpa pasangan</option>
        {pilihan.map((o) => (
          <option key={o.id} value={o.id}>
            Pasangan: {o.nama}
          </option>
        ))}
      </select>
      <button className="rounded border border-primary/30 px-2 py-1 text-xs">Simpan</button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground/50">
        Batal
      </button>
    </form>
  );
}
