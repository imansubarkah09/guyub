export type NodeLite = { id: string; parentId: string | null; spouseId: string | null; userId: string | null };

/**
 * Node yang boleh disentuh anggota biasa (bukan pengurus): dirinya sendiri, semua
 * leluhur (naik lewat parentId), semua keturunan (turun lewat children), dan
 * pasangannya sendiri. Di luar itu dianggap "menyebrang" ke keluarga orang lain.
 * `null` kalau viewer belum tertaut node sama sekali di tenant ini.
 */
export function computeScope(nodes: NodeLite[], viewerId: string): Set<string> | null {
  const mine = nodes.find((n) => n.userId === viewerId);
  if (!mine) return null;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    childrenOf.set(n.parentId, [...(childrenOf.get(n.parentId) ?? []), n.id]);
  }

  const scope = new Set<string>([mine.id]);
  for (let cur = byId.get(mine.id); cur?.parentId && !scope.has(cur.parentId); cur = byId.get(cur.parentId)) {
    scope.add(cur.parentId);
  }
  const antre = [mine.id];
  while (antre.length) {
    for (const anakId of childrenOf.get(antre.pop()!) ?? []) {
      if (!scope.has(anakId)) {
        scope.add(anakId);
        antre.push(anakId);
      }
    }
  }
  const pasangan = mine.spouseId ?? nodes.find((n) => n.spouseId === mine.id)?.id;
  if (pasangan) scope.add(pasangan);

  return scope;
}

/**
 * Node lepas (tanpa orang tua, pasangan, anak, atau akun) boleh diambil siapa
 * saja untuk disambungkan ke pohonnya sendiri — itulah cara menambah leluhur
 * baru: buat node tanpa relasi dulu, baru sambungkan lewat parentId/spouseId
 * di langkah berikutnya (edit node yang sudah ada di scope-mu).
 */
function isStub(nodes: NodeLite[], id: string): boolean {
  const n = nodes.find((x) => x.id === id);
  if (!n || n.userId || n.parentId || n.spouseId) return false;
  return !nodes.some((x) => x.parentId === id || x.spouseId === id);
}

/** Boleh dipakai sebagai referensi parentId/spouseId oleh anggota biasa. */
export function isReferenceable(nodes: NodeLite[], scope: Set<string>, id: string): boolean {
  return scope.has(id) || isStub(nodes, id);
}
