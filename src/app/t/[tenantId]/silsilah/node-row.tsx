"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateFamilyNodeAction, deleteFamilyNodeAction } from "./actions";
import { SearchableSelect } from "@/components/searchable-select";

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
  pengurus,
  hasChildren,
  hasSpouse,
}: {
  tenantId: string;
  node: { id: string; nama: string; parentId: string | null; spouseId: string | null; userId: string | null; urutan: number | null };
  options: Option[];
  anggota: Akun[];
  pengurus: boolean;
  hasChildren: boolean;
  hasSpouse: boolean;
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
      <SearchableSelect
        name="parentId"
        defaultValue={node.parentId ?? ""}
        emptyLabel="Tanpa orang tua"
        placeholder="Cari orang tua…"
        className="rounded border border-primary/30 p-1 text-xs"
        options={pilihan.map((o) => ({ value: o.id, label: `Anak dari ${o.nama}` }))}
      />
      <input
        type="number"
        name="urutan"
        min={1}
        defaultValue={node.urutan ?? ""}
        placeholder="Anak ke-"
        className="w-24 rounded border border-primary/30 p-1 text-xs"
      />
      <SearchableSelect
        name="spouseId"
        defaultValue={node.spouseId ?? ""}
        emptyLabel="Tanpa pasangan"
        placeholder="Cari pasangan…"
        className="rounded border border-primary/30 p-1 text-xs"
        options={pilihan.map((o) => ({ value: o.id, label: `Pasangan: ${o.nama}` }))}
      />
      <SearchableSelect
        name="userId"
        defaultValue={node.userId ?? ""}
        emptyLabel="Tanpa akun"
        placeholder="Cari akun…"
        className="rounded border border-primary/30 p-1 text-xs"
        options={anggota.map((a) => ({ value: a.id, label: `Akun: ${a.name} (${a.email})` }))}
      />
      <TombolKirim className="rounded border border-primary/30 px-2 py-1 text-xs">Simpan</TombolKirim>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground/50">
        Batal
      </button>
      {/* formAction: tombol hapus ikut form yang sama, jadi tidak perlu form bersarang
          (HTML melarangnya). confirm() dipasang karena penghapusan tidak bisa dibatalkan.
          Anggota biasa (bukan pengurus) wajib lepas pasangan & anak dulu (lihat actions.ts),
          jadi tombolnya dimatikan duluan supaya tidak nunggu round-trip buat tahu itu ditolak.
          `title` saja tidak cukup (tidak muncul di layar sentuh, tidak selalu dibacakan
          screen reader) — tombol sungguhan + keterangan teks yang selalu terlihat, bukan
          cuma tooltip (ketemu review 15 Sep 2026). */}
      {!pengurus && (hasChildren || hasSpouse) ? (
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Lepas dulu pasangan dan pindahkan anak-anaknya sebelum bisa menghapus"
            className="cursor-not-allowed text-xs text-muted"
          >
            Hapus
          </button>
          <span className="text-[11px] text-muted">(lepas pasangan/anak dulu)</span>
        </span>
      ) : (
        <TombolKirim
          formAction={deleteFamilyNodeAction}
          onClick={(e) => {
            const pesan = pengurus
              ? `Hapus "${node.nama}" dari silsilah? Anak-anaknya akan naik ke orang tua di atasnya.`
              : `Hapus "${node.nama}" dari silsilah?`;
            if (!confirm(pesan)) e.preventDefault();
          }}
          className="text-xs text-danger underline"
        >
          Hapus
        </TombolKirim>
      )}
    </form>
  );
}
