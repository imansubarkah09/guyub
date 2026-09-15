import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { AppHeader } from "@/components/app-header";
import { PageTitle } from "@/components/ui";
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
    <main className="min-h-screen">
      <AppHeader email={user.email} title="Guyub · Platform Owner" />
      <div className="mx-auto max-w-lg space-y-6 p-4">
        <section>
          <PageTitle title="Platform Owner Saat Ini" />
          <ul className="space-y-2">
            {owners.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-md border border-primary/15 p-3 text-sm">
                <span>
                  {o.name} <span className="text-foreground/60">({o.email})</span>
                </span>
                {o.id === user.id ? (
                  <span className="text-xs text-foreground/50">Anda</span>
                ) : (
                  <form action={setPlatformOwnerAction}>
                    <input type="hidden" name="userId" value={o.id} />
                    <input type="hidden" name="makeOwner" value="false" />
                    {/* Mencabut hak Platform Owner adalah aksi paling sensitif di
                        seluruh app — sebelumnya bobot visualnya sama netral dengan
                        tombol "Cari" biasa (§colorize, 15 Sep 2026). */}
                    <button className="rounded-md border border-danger/30 px-2 py-1 text-xs text-danger">Cabut</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Jadikan Platform Owner Baru</h2>
          <form className="mb-3 flex gap-2">
            <input name="q" defaultValue={query} placeholder="Cari nama atau email" className="flex-1 rounded-md border border-primary/30 p-2 text-sm" />
            <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Cari</button>
          </form>
          {query && results.length === 0 && <p className="text-sm text-foreground/60">Tidak ketemu pengguna dengan nama/email itu.</p>}
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-md border border-primary/15 p-3 text-sm">
                <span>
                  {r.name} <span className="text-foreground/60">({r.email})</span>
                </span>
                <form action={setPlatformOwnerAction}>
                  <input type="hidden" name="userId" value={r.id} />
                  <input type="hidden" name="makeOwner" value="true" />
                  <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Jadikan Owner</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
