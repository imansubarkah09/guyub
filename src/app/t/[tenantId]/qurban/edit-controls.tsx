"use client";

import { useState } from "react";
import { updateQurbanGroupAction, updateQurbanSlotAction } from "./actions";

export function EditGroupButton({
  tenantId,
  group,
}: {
  tenantId: string;
  group: { id: string; jenisHewan: string; targetPerJiwa: string };
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs font-normal text-primary underline">
        edit
      </button>
    );
  }
  return (
    <form
      action={async (formData) => {
        await updateQurbanGroupAction(formData);
        setEditing(false);
      }}
      className="mt-1 flex flex-wrap items-center gap-1"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="qurbanGroupId" value={group.id} />
      <select name="jenisHewan" defaultValue={group.jenisHewan} className="rounded border border-primary/30 p-1 text-xs">
        <option value="sapi">Sapi (7 jiwa)</option>
        <option value="kambing">Kambing (1 jiwa)</option>
      </select>
      <input type="number" name="targetPerJiwa" min="0" step="1" defaultValue={group.targetPerJiwa} required className="w-32 rounded border border-primary/30 p-1 text-xs" />
      <button className="rounded border border-primary/30 px-2 py-1 text-xs">Simpan</button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground/50">
        Batal
      </button>
    </form>
  );
}

export function EditSlotButton({ tenantId, slotId, saldoTerkumpul }: { tenantId: string; slotId: string; saldoTerkumpul: string }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs text-primary underline">
        edit
      </button>
    );
  }
  return (
    <form
      action={async (formData) => {
        await updateQurbanSlotAction(formData);
        setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="slotId" value={slotId} />
      <input type="number" name="saldoTerkumpul" min="0" step="1" defaultValue={saldoTerkumpul} required className="w-24 rounded border border-primary/30 p-1 text-xs" />
      <button className="rounded border border-primary/30 px-2 py-1 text-xs">Simpan</button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground/50">
        Batal
      </button>
    </form>
  );
}
