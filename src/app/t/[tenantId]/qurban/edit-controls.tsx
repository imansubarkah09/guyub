"use client";

import { useEffect, useState } from "react";
import { updateQurbanGroupAction, updateQurbanSlotAction, cancelQurbanSlotAction } from "./actions";
import { InputRupiah } from "@/components/input-rupiah";
import { Card, btnGhost } from "@/components/ui";

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
      <InputRupiah name="targetPerJiwa" className="w-32 rounded border border-primary/30 p-1 text-xs" defaultValue={group.targetPerJiwa} required />
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
      <InputRupiah name="saldoTerkumpul" className="w-24 rounded border border-primary/30 p-1 text-xs" defaultValue={saldoTerkumpul} required />
      <button className="rounded border border-primary/30 px-2 py-1 text-xs">Simpan</button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground/50">
        Batal
      </button>
    </form>
  );
}

/** Batal ikut slot, hanya muncul selama saldoTerkumpul-nya masih 0. Modal konfirmasi meniru pola TrakteerModal (backdrop + panel bg-surface). */
export function CancelSlotButton({ tenantId, slotId }: { tenantId: string; slotId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-danger underline">
        batal ikut
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-sm shadow-xl">
            <p className="font-semibold">Batal ikut slot qurban?</p>
            <p className="mt-1 text-sm text-muted">Slot ini akan dihapus dari daftar patungan, dan bisa diisi orang lain.</p>
            <form action={cancelQurbanSlotAction} className="mt-4 flex gap-2">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="slotId" value={slotId} />
              <button className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98]">
                Ya, batalkan
              </button>
              <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
                Tutup
              </button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
