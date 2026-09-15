import Link from "next/link";
import { TreePine, Search, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_ANGGOTA, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, inputClass } from "@/components/ui";
import { addFamilyNodeAction } from "./actions";
import { NodeRow } from "./node-row";
import { computeScope, isReferenceable } from "./scope";

type Node = Awaited<ReturnType<typeof loadNodes>>[number];

async function loadNodes(tenantId: string) {
  return prisma.familyNode.findMany({ where: { tenantId }, include: { spouse: true, user: true } });
}

/** Kandidat akun yang bisa ditautkan ke sebuah node: anggota aktif tenant ini. */
async function loadAnggota(tenantId: string) {
  const m = await prisma.membership.findMany({
    where: { tenantId, status: "active" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return m.map((x) => x.user);
}

function Branch({
  node,
  byParent,
  tenantId,
  options,
  anggota,
  canKelola,
  pengurus,
  highlightId,
  matchIds,
}: {
  node: Node;
  byParent: Map<string | null, Node[]>;
  tenantId: string;
  options: { id: string; nama: string }[];
  anggota: { id: string; name: string; email: string }[];
  canKelola: boolean;
  pengurus: boolean;
  highlightId: string | null;
  matchIds: Set<string> | null;
}) {
  const children = byParent.get(node.id) ?? [];
  const isMe = node.id === highlightId;
  const isMatch = matchIds?.has(node.id) ?? false;
  return (
    <li>
      <span className={`inline-flex flex-wrap items-center gap-1 rounded-lg px-2 py-1 ${isMe ? "bg-primary/10 ring-1 ring-primary/40" : isMatch ? "bg-warning/10" : ""}`}>
        {node.urutan != null && <Badge tone="muted">Anak ke-{node.urutan}</Badge>}
        {canKelola ? (
          <NodeRow
            tenantId={tenantId}
            node={node}
            options={options}
            anggota={anggota}
            pengurus={pengurus}
            hasChildren={children.length > 0}
            hasSpouse={Boolean(node.spouse)}
          />
        ) : (
          <span className="font-medium">{node.nama}</span>
        )}
        {node.spouse && <span className="text-muted">⚭ {node.spouse.nama}</span>}
        {isMe && <Badge tone="primary">Anda</Badge>}
        {node.user && !isMe && <span className="text-xs text-muted">({node.user.name})</span>}
      </span>
      {/* <details> bawaan browser: buka/tutup satu tingkat tanpa JavaScript sama
          sekali, dan tetap jalan sebelum hidrasi. Barisnya sengaja DI LUAR
          <summary> supaya tombol edit/hapus tidak ikut men-toggle cabang. */}
      {children.length > 0 && (
        <details open className="group ml-1">
          <summary className="inline-flex cursor-pointer select-none items-center gap-1 text-[11px] text-muted marker:content-none [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            {children.length} anak
          </summary>
          <ul className="mt-1 ml-3 space-y-1 border-l border-border pl-3">
            {children.map((c) => (
              <Branch key={c.id} node={c} byParent={byParent} tenantId={tenantId} options={options} anggota={anggota} canKelola={canKelola} pengurus={pengurus} highlightId={highlightId} matchIds={matchIds} />
            ))}
          </ul>
        </details>
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
  const [nodes, anggota] = await Promise.all([loadNodes(tenantId), loadAnggota(tenantId)]);

  const pengurus = has(roles, CAN_KELOLA_ANGGOTA);
  /**
   * Anggota biasa (bukan pengurus) cuma boleh mengelola node dalam scope-nya
   * sendiri: dirinya, leluhur, keturunan, pasangan — bukan keluarga orang lain
   * yang tidak ada relasinya (lihat scope.ts & authz-nya di actions.ts).
   */
  const scope = pengurus ? null : computeScope(nodes, viewerId);
  const canKelola = pengurus || scope !== null;
  const pilihanRelasi = pengurus || !scope ? nodes : nodes.filter((n) => isReferenceable(nodes, scope, n.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byParent = new Map<string | null, Node[]>();
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }
  // "Anak ke-" yang diisi manual menentukan urutan; yang belum diatur turun ke
  // bawah dan diurutkan nama, supaya susunannya tidak berubah-ubah tiap render.
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.urutan ?? Infinity) - (b.urutan ?? Infinity) || a.nama.localeCompare(b.nama));
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
                options={pilihanRelasi.map((x) => ({ id: x.id, nama: x.nama }))}
                anggota={anggota}
                canKelola={canKelola}
                pengurus={pengurus}
                highlightId={nodeSaya?.id ?? null}
                matchIds={matchIds}
              />
            ))}
          </ul>
        </Card>
      )}

      {!nodeSaya && (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm">
            {canKelola
              ? "Anda belum punya posisi di silsilah ini. Tambahkan nama Anda lewat form di bawah, lalu pilih akun Anda di kolom \"Tautkan akun\" supaya kotaknya ditandai sebagai Anda. Kalau nama Anda sudah ada di pohon, cukup klik edit di nama itu dan tautkan akunnya."
              : "Anda belum punya posisi di silsilah ini. Minta pengurus menautkan akun Anda ke nama Anda di pohon keluarga."}
          </p>
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
              {pilihanRelasi.map((n) => (
                <option key={n.id} value={n.id}>
                  Anak dari {n.nama}
                </option>
              ))}
            </select>
            <select name="spouseId" className={inputClass}>
              <option value="">Tanpa pasangan</option>
              {pilihanRelasi.map((n) => (
                <option key={n.id} value={n.id}>
                  Pasangan: {n.nama}
                </option>
              ))}
            </select>
            <input type="number" name="urutan" min={1} placeholder="Anak ke- (opsional)" className={inputClass} />
            <select name="userId" className={inputClass} defaultValue="">
              <option value="">Tautkan akun: tidak ada</option>
              {anggota.map((a) => (
                <option key={a.id} value={a.id}>
                  Tautkan akun: {a.name} ({a.email})
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
