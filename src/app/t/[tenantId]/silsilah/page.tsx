import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_KELOLA_ANGGOTA } from "@/lib/authz";
import { addFamilyNodeAction } from "./actions";

type Node = Awaited<ReturnType<typeof loadNodes>>[number];

async function loadNodes(tenantId: string) {
  return prisma.familyNode.findMany({ where: { tenantId }, include: { spouse: true, user: true } });
}

function Branch({ node, byParent }: { node: Node; byParent: Map<string | null, Node[]> }) {
  const children = byParent.get(node.id) ?? [];
  return (
    <li>
      <span className="font-medium">{node.nama}</span>
      {node.spouse && <span className="text-foreground/60"> ⚭ {node.spouse.nama}</span>}
      {node.user && <span className="text-xs text-foreground/50"> ({node.user.email})</span>}
      {children.length > 0 && (
        <ul className="mt-1 ml-4 space-y-1 border-l border-primary/15 pl-3">
          {children.map((c) => (
            <Branch key={c.id} node={c} byParent={byParent} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function SilsilahPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, nodes] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    loadNodes(tenantId),
  ]);

  const canKelola = me.roles.some((r) => CAN_KELOLA_ANGGOTA.includes(r));
  const byParent = new Map<string | null, Node[]>();
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }
  const roots = byParent.get(null) ?? [];

  return (
    <div className="space-y-4">
      {roots.length === 0 && <p className="text-sm text-foreground/60">Belum ada data silsilah.</p>}
      <ul className="space-y-2 text-sm">
        {roots.map((n) => (
          <Branch key={n.id} node={n} byParent={byParent} />
        ))}
      </ul>

      {canKelola && (
        <form action={addFamilyNodeAction} className="space-y-2 rounded-md border border-primary/15 p-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input name="nama" required placeholder="Nama" className="w-full rounded-md border border-primary/30 p-2 text-sm" />
          <select name="parentId" className="w-full rounded-md border border-primary/30 p-2 text-sm">
            <option value="">Tanpa orang tua (leluhur)</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                Anak dari {n.nama}
              </option>
            ))}
          </select>
          <select name="spouseId" className="w-full rounded-md border border-primary/30 p-2 text-sm">
            <option value="">Belum menikah / tanpa pasangan</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                Pasangan: {n.nama}
              </option>
            ))}
          </select>
          <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
            Tambah Anggota Silsilah
          </button>
        </form>
      )}
    </div>
  );
}
