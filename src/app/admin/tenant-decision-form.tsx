"use client";

import { useActionState } from "react";
import { btnPrimary, btnGhost, inputClass } from "@/components/ui";
import { decideTenantAction } from "./actions";

export function TenantDecisionForm({ tenantId }: { tenantId: string }) {
  const [state, formAction, pending] = useActionState(decideTenantAction, null);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap gap-2">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input name="catatan" placeholder="Catatan (opsional)" className={`${inputClass} flex-1`} />
      <button name="decision" value="approved" disabled={pending} className={`${btnPrimary} disabled:opacity-50`}>
        Setujui
      </button>
      <button name="decision" value="rejected" disabled={pending} className={`${btnGhost} disabled:opacity-50`}>
        Tolak
      </button>
      {state?.error && <p className="w-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}
