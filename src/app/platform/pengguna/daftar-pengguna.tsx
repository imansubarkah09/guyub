"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Card, EmptyState, Badge, btnGhost } from "@/components/ui";
import { startPreviewAction } from "@/app/admin/actions";

/** Duplikat kecil JENIS_LABEL, pola yang sama sudah dipakai di admin/page.tsx,
 * dashboard/page.tsx, cari/page.tsx: konstanta literal sekecil ini sengaja
 * diduplikasi per file, bukan diekstrak jadi satu modul bersama. */
const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;

export type PenggunaRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  memberships: {
    id: string;
    roles: string[];
    tenant: { id: string; jenis: "keluarga" | "rt" | "paguyuban"; profile: { nama: string } | null };
  }[];
};

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "aktif", label: "Aktif" },
  { key: "belum", label: "Belum Ada Tenant" },
] as const;

export function DaftarPengguna({ users }: { users: PenggunaRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("semua");
  const jumlahAktif = users.filter((u) => u.memberships.length > 0).length;
  const jumlah = { semua: users.length, aktif: jumlahAktif, belum: users.length - jumlahAktif };
  const filtered = users.filter((u) => (tab === "semua" ? true : tab === "aktif" ? u.memberships.length > 0 : u.memberships.length === 0));

  if (users.length === 0) {
    return <EmptyState icon={Users} title="Belum ada pengguna" desc="Pengguna akan muncul di sini setelah ada yang login lewat Google." />;
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
        <EmptyState icon={Users} title="Tidak ada pengguna di kategori ini" desc="Coba pilih tab lain." />
      ) : (
        <ul className="space-y-2">
          {filtered.map((u) => (
            <li key={u.id}>
              <Card>
                <div className="flex items-center gap-2">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.image} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                </div>

                {u.memberships.length === 0 ? (
                  <p className="mt-2 border-t border-border pt-2 text-xs text-muted">Belum tergabung di tenant mana pun.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
                    {u.memberships.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{m.tenant.profile?.nama ?? "(tanpa nama)"}</span>
                          <Badge tone="muted">{JENIS_LABEL[m.tenant.jenis]}</Badge>
                          {m.roles.map((r) => (
                            <Badge key={r} tone={r === "anggota" ? "muted" : "primary"}>
                              {r}
                            </Badge>
                          ))}
                        </div>
                        <form action={startPreviewAction}>
                          <input type="hidden" name="tenantId" value={m.tenant.id} />
                          <input type="hidden" name="mode" value="user" />
                          <input type="hidden" name="value" value={u.id} />
                          <button className={`${btnGhost} px-2 py-0.5 text-[11px]`}>Preview</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
