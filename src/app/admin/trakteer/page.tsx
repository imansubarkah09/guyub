import Link from "next/link";
import { Heart, Link2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { RUPIAH_PER_HARI, sisaHari } from "@/lib/trakteer";
import { Card, PageTitle, EmptyState, Badge, StatCard, btnPrimary, btnGhost, inputClass, rupiah, tanggal } from "@/components/ui";
import { SearchableSelect } from "@/components/searchable-select";
import { tautkanDonasiAction, tarikDonasiAction } from "./actions";

export default async function AdminTrakteerPage() {
  const user = await requireUser();
  requirePlatformOwner(user);

  // `trakteer: true` dulu menarik SELURUH baris donasi milik SETIAP tenant hanya
  // untuk menampilkan jumlah dan totalnya — satu groupBy menggantikan semuanya.
  // "Total Donasi Tercatat" juga dulu dijumlah dari 50 baris terakhir saja, jadi
  // angkanya salah begitu donasi lewat 50; sekarang dijumlah di SQL.
  const [tenants, rekap, donasi, belumTertaut] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, kodeDonasi: true, nyawaSampai: true, profile: { select: { nama: true } }, _count: { select: { memberships: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trakteerDonasi.groupBy({ by: ["tenantId"], _sum: { jumlah: true }, _count: { _all: true } }),
    prisma.trakteerDonasi.findMany({
      select: { id: true, orderId: true, namaDonatur: true, jumlah: true, hariNyawa: true, pesan: true, createdAt: true, tenant: { select: { profile: { select: { nama: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.trakteerDonasi.findMany({
      where: { tenantId: null },
      select: { id: true, namaDonatur: true, jumlah: true, hariNyawa: true, pesan: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const rekapTenant = new Map(rekap.map((r) => [r.tenantId, { total: Number(r._sum.jumlah ?? 0), jumlahDonasi: r._count._all }]));
  const totalMasuk = rekap.reduce((a, r) => a + Number(r._sum.jumlah ?? 0), 0);
  const jumlahBelumTertaut = rekapTenant.get(null)?.jumlahDonasi ?? 0;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Monitor Trakteer"
        desc={`Rp${RUPIAH_PER_HARI.toLocaleString("id-ID")} = 1 hari masa aktif`}
        action={
          <span className="flex gap-2">
            <form action={tarikDonasiAction}>
              <button className={btnPrimary}>Tarik dari Trakteer</button>
            </form>
            <Link href="/admin" className={btnGhost}>
              Kembali
            </Link>
          </span>
        }
      />

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Total Donasi Tercatat" value={rupiah.format(totalMasuk)} icon={Heart} />
        <StatCard label="Belum Tertaut Tenant" value={String(jumlahBelumTertaut)} icon={Link2} tone="accent" sub="Perlu ditautkan manual" />
      </section>

      {belumTertaut.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <h2 className="mb-2 text-sm font-semibold">Donasi Tanpa Kode Tenant</h2>
          <p className="mb-3 text-xs text-muted">Donatur tidak menuliskan kode tenant di pesan dukungan. Pilih tenant tujuannya supaya nyawanya ditambahkan.</p>
          <ul className="space-y-2">
            {belumTertaut.map((d) => (
              <li key={d.id} className="rounded-lg border border-border p-2 text-sm">
                <p>
                  <strong>{d.namaDonatur}</strong> · {rupiah.format(Number(d.jumlah))} · +{d.hariNyawa} hari
                </p>
                {d.pesan && <p className="mt-0.5 text-xs text-muted">&quot;{d.pesan}&quot;</p>}
                <form action={tautkanDonasiAction} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="donasiId" value={d.id} />
                  <SearchableSelect
                    name="tenantId"
                    required
                    placeholder="Cari tenant…"
                    className={`${inputClass} flex-1 text-xs`}
                    options={tenants.map((t) => ({ value: t.id, label: t.profile?.nama ?? t.id }))}
                  />
                  <button className={btnPrimary}>Tautkan</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Nyawa per Tenant</h2>
        <ul className="space-y-2">
          {tenants.map((t) => {
            const sisa = sisaHari(t.nyawaSampai);
            const { total, jumlahDonasi } = rekapTenant.get(t.id) ?? { total: 0, jumlahDonasi: 0 };
            return (
              <li key={t.id}>
                <Card className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.profile?.nama ?? "(tanpa nama)"}</p>
                    <p className="text-xs text-muted">
                      Kode <code className="font-mono">{t.kodeDonasi}</code> · {t._count.memberships} anggota · {jumlahDonasi} donasi ·{" "}
                      {rupiah.format(total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={sisa === 0 ? "danger" : sisa < 14 ? "warning" : "success"}>{sisa === 0 ? "habis" : `${sisa} hari`}</Badge>
                    <p className="mt-0.5 text-[11px] text-muted">{t.nyawaSampai ? tanggal.format(t.nyawaSampai) : "belum pernah didukung"}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Donasi Terakhir</h2>
        {donasi.length === 0 ? (
          <EmptyState icon={Heart} title="Belum ada donasi" desc="Donasi Trakteer akan muncul di sini begitu callback-nya diterima." />
        ) : (
          <ul className="space-y-2">
            {donasi.map((d) => (
              <li key={d.id}>
                <Card className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.namaDonatur}</p>
                    <p className="truncate text-xs text-muted">
                      {tanggal.format(d.createdAt)} · {d.tenant?.profile?.nama ?? "belum tertaut"} · order {d.orderId}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-right">
                    <span className="block text-sm font-medium tabular-nums">{rupiah.format(Number(d.jumlah))}</span>
                    <span className="block text-[11px] text-muted">+{d.hariNyawa} hari</span>
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
