import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
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

  return (
    <main className="min-h-screen">
      <AppHeader email={user.email} />
      <div className="mx-auto max-w-lg space-y-6 p-4">
        <section>
          <h1 className="mb-2 text-lg font-semibold">Tenant Anda</h1>
          {memberships.length === 0 && <p className="text-sm text-foreground/60">Belum tergabung di tenant manapun.</p>}
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.id} className="rounded-md border border-primary/15 p-3">
                {m.status === "active" ? (
                  <a href={`/t/${m.tenantId}`} className="font-medium text-primary">
                    {m.tenant.profile?.nama ?? "(tanpa nama)"}
                  </a>
                ) : (
                  <span className="font-medium">{m.tenant.profile?.nama ?? "(tanpa nama)"}</span>
                )}
                <p className="text-xs text-foreground/60">
                  {JENIS_LABEL[m.tenant.jenis]} · {m.roles.join(", ")} · {STATUS_LABEL[m.status]}
                  {m.status === "active" && m.tenant.status !== "approved" && " · Menunggu persetujuan Iman"}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-primary/15 p-3">
          <h2 className="mb-2 text-sm font-semibold">Daftarkan Tenant Baru</h2>
          <form
            action={async (formData) => {
              "use server";
              const tenantId = await createTenantAction(formData);
              const { redirect } = await import("next/navigation");
              redirect(`/t/${tenantId}`);
            }}
            className="space-y-2"
          >
            <select name="jenis" required className="w-full rounded-md border border-primary/30 p-2 text-sm">
              <option value="keluarga">Keluarga</option>
              <option value="rt">RT</option>
              <option value="paguyuban">Paguyuban</option>
            </select>
            <input
              name="nama"
              required
              placeholder="Nama tenant, misal: Keluarga Besar Suharto"
              className="w-full rounded-md border border-primary/30 p-2 text-sm"
            />
            <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
              Daftarkan
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
