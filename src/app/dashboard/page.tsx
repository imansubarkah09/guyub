import Link from "next/link";
import { Home, Plus, ShieldCheck, MessageCircle, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { waShareUrl } from "@/lib/whatsapp";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, btnGhost, inputClass } from "@/components/ui";
import { ProfileMenu } from "@/components/profile-menu";
import { createTenantAction } from "./actions";

const JENIS_LABEL = { keluarga: "Keluarga", rt: "RT", paguyuban: "Paguyuban" } as const;
const STATUS_LABEL = { pending_confirmation: "Menunggu konfirmasi pengurus", active: "Aktif", removed: "Dikeluarkan" } as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { tenant: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });
  const base = process.env.NEXT_PUBLIC_URL ?? "";
  const ajakText = `Yuk kelola kas & tabungan keluarga/RT/paguyuban kita di Guyub: ${base}/cari`;

  return (
    // pt-safe di container, bukan di header h-14 langsung: kalau ditaruh di
    // header, padding notch/status bar (bisa ~50px+) akan mengempis tinggi
    // tetapnya sendiri (box-sizing: border-box), bukan menambah tinggi total.
    // Ini start_url PWA (manifest.ts), layar pertama yang dilihat user
    // standalone (§adapt, 26 Sep 2026).
    <main className="pt-safe min-h-screen">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <span className="font-semibold tracking-tight text-primary">Guyub</span>
        <ProfileMenu
          user={{ name: user.name, email: user.email, phone: user.phone ?? null, image: user.image ?? null, isPlatformOwner: user.isPlatformOwner }}
        />
      </header>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        <PageTitle title={`Halo, ${user.name.split(" ")[0]}`} desc="Pilih tenant yang ingin Anda buka" />

        {user.isPlatformOwner && (
          <Link href="/admin" className="flex items-center gap-2 rounded-[var(--radius)] border border-accent/30 bg-accent/5 p-3 text-sm font-medium text-accent">
            <ShieldCheck className="h-4 w-4" />
            Area Platform Owner — kelola & preview semua tenant
          </Link>
        )}

        <section>
          {memberships.length === 0 ? (
            <EmptyState
              icon={Home}
              title="Belum tergabung di tenant manapun"
              desc="Cari arisan keluarga/RT/paguyuban Anda, atau daftarkan yang baru lewat form di bawah."
              action={
                <Link href="/cari" className={btnPrimary}>
                  <Search className="h-4 w-4" /> Cari Tenant
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {memberships.map((m) => {
                const nama = m.tenant.profile?.nama ?? "(tanpa nama)";
                const aktif = m.status === "active";
                return (
                  <li key={m.id}>
                    <Card className={aktif ? "transition hover:border-primary/40" : "opacity-75"}>
                      {aktif ? (
                        <Link href={`/t/${m.tenantId}`} className="block">
                          <p className="font-medium text-primary">{nama}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {JENIS_LABEL[m.tenant.jenis]} · {m.roles.join(", ")}
                            {m.tenant.status !== "approved" && " · menunggu persetujuan Platform Owner"}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className="font-medium">{nama}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {JENIS_LABEL[m.tenant.jenis]} · <Badge tone="warning">{STATUS_LABEL[m.status]}</Badge>
                          </p>
                        </>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          <Link href="/cari" className={btnGhost}>
            <Search className="h-4 w-4" /> Cari Tenant
          </Link>
          <a href={waShareUrl(ajakText)} target="_blank" rel="noreferrer" className={`${btnGhost} text-success`}>
            <MessageCircle className="h-4 w-4" /> Ajak lewat WhatsApp
          </a>
        </div>

        <Card>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Plus className="h-4 w-4 text-primary" /> Daftarkan Tenant Baru
          </h2>
          <form
            action={async (formData) => {
              "use server";
              const tenantId = await createTenantAction(formData);
              const { redirect } = await import("next/navigation");
              redirect(`/t/${tenantId}`);
            }}
            className="space-y-2"
          >
            <select name="jenis" required className={inputClass}>
              <option value="keluarga">Keluarga</option>
              <option value="rt">RT</option>
              <option value="paguyuban">Paguyuban</option>
            </select>
            <input name="nama" required placeholder="Nama tenant, misal: Keluarga Besar Suharto" className={inputClass} />
            <button type="submit" className={`${btnPrimary} w-full`}>
              Daftarkan
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">Tenant baru perlu disetujui Platform Owner sebelum bisa dipakai.</p>
        </Card>
      </div>
    </main>
  );
}
