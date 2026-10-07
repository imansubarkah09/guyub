"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Card, EmptyState, Badge, btnGhost } from "@/components/ui";
import { updateRolesAction } from "./actions";

const ALL_ROLES = ["pemilik", "ketua", "wakil_ketua", "bendahara", "sekretaris", "anggota"] as const;
/** Duplikat kecil dari ROLE_LABEL di lib/authz, sengaja tidak diimpor: authz.ts
 * ikut mengimpor prisma di level modul, jadi kalau diimpor dari sini (client
 * component) Prisma ikut kebundel ke JS browser. */
const ROLE_LABEL: Record<(typeof ALL_ROLES)[number], string> = {
  pemilik: "Pemilik",
  ketua: "Ketua",
  wakil_ketua: "Wakil Ketua",
  bendahara: "Bendahara",
  sekretaris: "Sekretaris",
  anggota: "Anggota",
};

export type ActiveMember = {
  id: string;
  userId: string;
  roles: string[];
  isPengurus: boolean;
  user: { name: string; email: string; image: string | null };
};

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "pengurus", label: "Pengurus" },
  { key: "anggota", label: "Anggota" },
] as const;

export function AnggotaAktifList({
  tenantId,
  active,
  viewerId,
  canKelola,
  bisaUbahKetua,
  bisaUbahPemilik,
}: {
  tenantId: string;
  active: ActiveMember[];
  viewerId: string | null;
  canKelola: boolean;
  bisaUbahKetua: boolean;
  bisaUbahPemilik: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("semua");
  const jumlahPengurus = active.filter((m) => m.isPengurus).length;
  const jumlah = { semua: active.length, pengurus: jumlahPengurus, anggota: active.length - jumlahPengurus };
  const filtered = active.filter((m) => (tab === "semua" ? true : tab === "pengurus" ? m.isPengurus : !m.isPengurus));

  if (active.length === 0) {
    return <EmptyState icon={Users} title="Belum ada anggota" desc="Buat link undangan dan sebarkan lewat WhatsApp untuk mengajak anggota." />;
  }

  return (
    <>
      <div className="mb-3 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? "bg-primary text-primary-foreground" : "border border-border text-muted hover:bg-primary/5"
            }`}
          >
            {t.label} ({jumlah[t.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Tidak ada anggota di kategori ini" desc="Coba pilih tab lain." />
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => (
            <li key={m.id}>
              <Card className={m.userId === viewerId ? "bg-primary/5" : ""}>
                <div className="flex items-center gap-2">
                  {m.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.user.image} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {m.user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.user.name} {m.userId === viewerId && <Badge tone="primary">Anda</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted">{m.user.email}</p>
                  </div>
                </div>

                {canKelola && (!m.roles.includes("ketua") || bisaUbahKetua) && (!m.roles.includes("pemilik") || bisaUbahPemilik) ? (
                  <form action={updateRolesAction} className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-xs">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="membershipId" value={m.id} />
                    {ALL_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-1 rounded-md border border-border px-2 py-1">
                        <input type="checkbox" name="roles" value={role} defaultChecked={m.roles.includes(role)} />
                        {ROLE_LABEL[role]}
                      </label>
                    ))}
                    <button className={`${btnGhost} px-2 py-1 text-xs`}>Simpan</button>
                  </form>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
                    {m.roles.map((r) => (
                      <Badge key={r} tone={r === "anggota" ? "muted" : "primary"}>
                        {r}
                      </Badge>
                    ))}
                    {canKelola && m.roles.includes("ketua") && !bisaUbahKetua && (
                      <span className="text-[11px] text-muted">Peran ketua yang menjabat cuma bisa diubah ketua/wakil ketua atau platform owner.</span>
                    )}
                    {canKelola && m.roles.includes("pemilik") && !bisaUbahPemilik && (
                      <span className="text-[11px] text-muted">Peran pemilik cuma bisa diubah platform owner.</span>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
