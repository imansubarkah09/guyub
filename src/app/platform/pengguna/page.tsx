import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { PageTitle, btnGhost, inputClass } from "@/components/ui";
import { DaftarPengguna } from "./daftar-pengguna";

export default async function DaftarPenggunaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  requirePlatformOwner(user);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: {
      isPlatformOwner: false,
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      memberships: {
        where: { status: "active" },
        select: {
          id: true,
          roles: true,
          tenant: { select: { id: true, jenis: true, profile: { select: { nama: true } } } },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-3xl p-4 pb-16">
      <PageTitle
        title="Daftar Pengguna"
        desc="Semua akun terdaftar dan keanggotaan tenantnya (keluarga, RT, atau paguyuban)."
        action={
          <Link href="/admin" className={btnGhost}>
            Ke Platform Owner
          </Link>
        }
      />

      <form className="mb-4 flex gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={query} placeholder="Cari nama atau email" className={`${inputClass} py-1 pl-8 text-xs`} />
        </div>
        <button className={`${btnGhost} px-2 py-1 text-xs`}>Cari</button>
      </form>

      <DaftarPengguna users={users} />
    </main>
  );
}
