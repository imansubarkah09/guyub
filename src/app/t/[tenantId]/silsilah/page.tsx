import Link from "next/link";
import { TreePine, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_ANGGOTA, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, inputClass } from "@/components/ui";
import { addFamilyNodeAction } from "./actions";
import { NodeRow } from "./node-row";

type Node = Awaited<ReturnType<typeof loadNodes>>[number];

async function loadNodes(tenantId: string) {
  return prisma.familyNode.findMany({ where: { tenantId }, include: { spouse: true, user: true } });
}

function Branch({
  node,
  byParent,
  tenantId,
  options,
  canKelola,
  highlightId,
  matchIds,
}: {
  node: Node;
  byParent: Map<string | null, Node[]>;
  tenantId: string;
  options: { id: string; nama: string }[];
  canKelola: boolean;
  highlightId: string | null;
  matchIds: Set<string> | null;
}) {
  const children = byParent.get(node.id) ?? [];
  const isMe = node.id === highlightId;
  const isMatch = matchIds?.has(node.id) ?? false;
  return (
    <li>
      <span className={`inline-flex flex-wrap items-center gap-1 rounded-lg px-2 py-1 ${isMe ? "bg-primary/10 ring-1 ring-primary/40" : isMatch ? "bg-warning/10" : ""}`}>
        {canKelola ? <NodeRow tenantId={tenantId} node={node} options={options} /> : <span className="font-medium">{node.nama}</span>}
        {node.spouse && <span className="text-muted">⚭ {node.spouse.nama}</span>}
        {isMe && <Badge tone="primary">Anda</Badge>}
        {node.user && !isMe && <span className="text-xs text-muted">({node.user.name})</span>}
      </span>
      {children.length > 0 && (
        <ul className="mt-1 ml-3 space-y-1 border-l border-border pl-3">
          {children.map((c) => (
            <Branch key={c.id} node={c} byParent={byParent} tenantId={tenantId} options={options} canKelola={canKelola} highlightId={highlightId} matchIds={matchIds} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function SilsilahPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ q?: string; semua?: string }>;
}) {
  const { tenantId } = await params;
  const { q, semua } = await searchParams;
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);
  const viewerId = await viewerUserId(user, tenantId);
  const nodes = await loadNodes(tenantId);

  const canKelola = has(roles, CAN_KELOLA_ANGGOTA);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byParent = new Map<string | null, Node[]>();
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }

  const nodeSaya = nodes.find((n) => n.userId === viewerId) ?? null;
  const query = q?.trim() ?? "";
  const matches = query ? nodes.filter((n) => n.nama.toLowerCase().includes(query.toLowerCase())) : [];

  /** Naik ke leluhur tertinggi supaya konteks pohonnya ikut tampil, bukan cuma satu baris nama. */
  function akarDari(node: Node): Node {
    let cur = node;
    const seen = new Set<string>();
    while (cur.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.parentId);
      if (!parent) break;
      cur = parent;
    }
    return cur;
  }

  const semuaAkar = byParent.get(null) ?? [];
  let akar: Node[];
  let matchIds: Set<string> | null = null;
  let konteks: string | null = null;

  if (query) {
    matchIds = new Set(matches.map((m) => m.id));
    akar = [...new Map(matches.map((m) => [akarDari(m).id, akarDari(m)])).values()];
    konteks = `${matches.length} hasil untuk "${query}"`;
  } else if (nodeSaya && !semua) {
    const root = akarDari(nodeSaya);
    akar = [root];
    konteks = "Menampilkan pohon keluarga Anda";
  } else {
    akar = semuaAkar;
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Silsilah Keluarga" desc="Hubungan darah & pernikahan antar anggota" />

      <form className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={query} placeholder="Cari nama…" className={`${inputClass} pl-9`} />
        </div>
        <button className={btnPrimary}>Cari</button>
      </form>

      {konteks && (
        <p className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>{konteks}</span>
          {!query && nodeSaya && (
            <Link href={`/t/${tenantId}/silsilah?semua=1`} className="text-primary underline">
              Lihat semua pohon
            </Link>
          )}
          {query && (
            <Link href={`/t/${tenantId}/silsilah`} className="text-primary underline">
              Reset
            </Link>
          )}
        </p>
      )}

      {nodes.length === 0 ? (
        <EmptyState
          icon={TreePine}
          title="Belum ada silsilah"
          desc={canKelola ? "Mulai dari leluhur tertinggi, lalu tambahkan anak & pasangannya." : "Pengurus belum menyusun silsilah keluarga tenant ini."}
        />
      ) : akar.length === 0 ? (
        <EmptyState icon={Search} title="Tidak ditemukan" desc={`Tidak ada nama yang cocok dengan "${query}".`} />
      ) : (
        <Card>
          <ul className="space-y-1 text-sm">
            {akar.map((n) => (
              <Branch
                key={n.id}
                node={n}
                byParent={byParent}
                tenantId={tenantId}
                options={nodes.map((x) => ({ id: x.id, nama: x.nama }))}
                canKelola={canKelola}
                highlightId={nodeSaya?.id ?? null}
                matchIds={matchIds}
              />
            ))}
          </ul>
        </Card>
      )}

      {!nodeSaya && (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm">Anda belum punya posisi di silsilah ini. Tambahkan diri Anda lewat form di bawah, lalu hubungkan ke orang tua/pasangan.</p>
        </Card>
      )}

      {canKelola && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Tambah Anggota Silsilah</h2>
          <form action={addFamilyNodeAction} className="space-y-2">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input name="nama" required placeholder="Nama lengkap" className={inputClass} />
            <select name="parentId" className={inputClass}>
              <option value="">Tanpa orang tua (leluhur tertinggi)</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Anak dari {n.nama}
                </option>
              ))}
            </select>
            <select name="spouseId" className={inputClass}>
              <option value="">Tanpa pasangan</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Pasangan: {n.nama}
                </option>
              ))}
            </select>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Tambah
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
