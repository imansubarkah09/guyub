import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { AuthScreen } from "@/components/auth-screen";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Badge, Card, PageTitle, btnPrimary, inputClass } from "@/components/ui";
import { requestJoinAction } from "./actions";

const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;

export default async function CariPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getSessionUser();

  if (!user) {
    return (
      <AuthScreen icon={Search} title="Cari Tenant" description="Masuk dulu untuk mencari arisan keluarga, RT, atau paguyuban Anda di Guyub.">
        <GoogleSignInButton callbackURL="/cari" />
      </AuthScreen>
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
      <PageTitle title="Cari Tenant" />
      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Nama keluarga, RT, atau paguyuban" className={inputClass} />
        <button className={btnPrimary}>Cari</button>
      </form>

      {query && results.length === 0 && <p className="text-sm text-foreground/60">Tidak ketemu tenant dengan nama itu.</p>}

      <ul className="space-y-2">
        {results.map((r) => {
          const status = statusByTenant.get(r.id);
          return (
            <li key={r.id}>
              <Card className="flex items-center justify-between gap-2 p-3 text-sm">
                {/* min-w-0: tanpa ini flex item tidak bisa menyusut, jadi nama
                    tenant yang panjang mendorong tombol di kanan sampai
                    terpotong/keluar layar, bukan sekadar memotong teksnya
                    sendiri (§harden, 15 Sep 2026). */}
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.profile?.nama}</p>
                  <p className="text-xs text-foreground/60">{JENIS_LABEL[r.jenis]}</p>
                </div>
                {status === "active" ? (
                  <Link href={`/t/${r.id}`} className="flex-shrink-0 text-xs text-primary underline">
                    Buka
                  </Link>
                ) : status === "pending_confirmation" ? (
                  <Badge tone="warning">Menunggu konfirmasi</Badge>
                ) : (
                  <form action={requestJoinAction} className="flex-shrink-0">
                    <input type="hidden" name="tenantId" value={r.id} />
                    <button className={`${btnPrimary} px-2 py-1 text-xs`}>Minta Gabung</button>
                  </form>
                )}
              </Card>
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
