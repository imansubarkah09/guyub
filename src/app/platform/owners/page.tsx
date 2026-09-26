import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { Card, PageTitle, btnPrimary, inputClass } from "@/components/ui";
import { setPlatformOwnerAction } from "./actions";

export default async function PlatformOwnersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  requirePlatformOwner(user);
  const { q } = await searchParams;

  const owners = await prisma.user.findMany({ where: { isPlatformOwner: true }, orderBy: { email: "asc" } });
  const query = q?.trim() ?? "";
  const results = query
    ? await prisma.user.findMany({
        where: {
          isPlatformOwner: false,
          OR: [{ email: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }],
        },
        take: 20,
      })
    : [];

  return (
    <div className="space-y-5">
      <PageTitle title="Platform Owner" />

      <section>
        <h2 className="mb-2 text-sm font-semibold">Platform Owner Saat Ini</h2>
        <ul className="space-y-2">
          {owners.map((o) => (
            <li key={o.id}>
              <Card className="flex items-center justify-between gap-2 p-3">
                {/* min-w-0 + truncate: email panjang tidak boleh mendorong tombol
                    "Cabut" sampai terpotong di halaman paling sensitif se-app ini
                    (§harden, 15 Sep 2026). */}
                <span className="min-w-0 truncate text-sm">
                  {o.name} <span className="text-foreground/60">({o.email})</span>
                </span>
                {o.id === user.id ? (
                  <span className="flex-shrink-0 text-xs text-foreground/50">Anda</span>
                ) : (
                  <form action={setPlatformOwnerAction} className="flex-shrink-0">
                    <input type="hidden" name="userId" value={o.id} />
                    <input type="hidden" name="makeOwner" value="false" />
                    {/* Mencabut hak Platform Owner adalah aksi paling sensitif di
                        seluruh app — sebelumnya bobot visualnya sama netral dengan
                        tombol "Cari" biasa (§colorize, 15 Sep 2026). */}
                    <button className="rounded-md border border-danger/30 px-2 py-1 text-xs text-danger">Cabut</button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Jadikan Platform Owner Baru</h2>
        <form className="mb-3 flex gap-2">
          <input name="q" defaultValue={query} placeholder="Cari nama atau email" className={inputClass} />
          <button className={btnPrimary}>Cari</button>
        </form>
        {query && results.length === 0 && <p className="text-sm text-foreground/60">Tidak ketemu pengguna dengan nama/email itu.</p>}
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id}>
              <Card className="flex items-center justify-between gap-2 p-3">
                <span className="min-w-0 truncate text-sm">
                  {r.name} <span className="text-foreground/60">({r.email})</span>
                </span>
                <form action={setPlatformOwnerAction} className="flex-shrink-0">
                  <input type="hidden" name="userId" value={r.id} />
                  <input type="hidden" name="makeOwner" value="true" />
                  <button className={`${btnPrimary} px-2 py-1 text-xs`}>Jadikan Owner</button>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
