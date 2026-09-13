import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { requestJoinAction } from "./actions";

const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;

export default async function CariPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-sm">Masuk dulu untuk mencari arisan keluarga, RT, atau paguyuban Anda di Guyub.</p>
          <GoogleSignInButton callbackURL="/cari" />
        </div>
      </main>
    );
  }

  const query = q?.trim() ?? "";
  const results = query
    ? await prisma.tenant.findMany({
        where: { status: "approved", profile: { nama: { contains: query, mode: "insensitive" } } },
        include: { profile: true },
        take: 20,
      })
    : [];
  const myMemberships = query
    ? await prisma.membership.findMany({ where: { userId: user.id, tenantId: { in: results.map((r) => r.id) } } })
    : [];
  const statusByTenant = new Map(myMemberships.map((m) => [m.tenantId, m.status]));

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-lg font-semibold">Cari Tenant</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Nama keluarga, RT, atau paguyuban" className="flex-1 rounded-md border border-primary/30 p-2 text-sm" />
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Cari</button>
      </form>

      {query && results.length === 0 && <p className="text-sm text-foreground/60">Tidak ketemu tenant dengan nama itu.</p>}

      <ul className="space-y-2">
        {results.map((r) => {
          const status = statusByTenant.get(r.id);
          return (
            <li key={r.id} className="flex items-center justify-between rounded-md border border-primary/15 p-3 text-sm">
              <div>
                <p className="font-medium">{r.profile?.nama}</p>
                <p className="text-xs text-foreground/60">{JENIS_LABEL[r.jenis]}</p>
              </div>
              {status === "active" ? (
                <Link href={`/t/${r.id}`} className="text-xs text-primary underline">
                  Buka
                </Link>
              ) : status === "pending_confirmation" ? (
                <span className="text-xs text-foreground/60">Menunggu konfirmasi</span>
              ) : (
                <form action={requestJoinAction}>
                  <input type="hidden" name="tenantId" value={r.id} />
                  <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Minta Gabung</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-center text-sm text-foreground/60">
        Tidak ketemu?{" "}
        <Link href="/dashboard" className="text-primary underline">
          Daftarkan tenant baru
        </Link>
      </p>
    </main>
  );
}
