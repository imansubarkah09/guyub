import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CONFIRM_ANGGOTA } from "@/lib/authz";
import { GenerateLaporanButton } from "./generate-button";

export default async function LaporanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, tenant, kas, laporanList] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, include: { profile: true } }),
    prisma.kasTransaksi.findMany({ where: { tenantId }, orderBy: { tanggal: "asc" } }),
    prisma.laporan.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
  ]);

  const canGenerate = me.roles.some((r) => CAN_CONFIRM_ANGGOTA.includes(r));
  const kasRows = kas.map((k) => ({
    tanggal: k.tanggal.toLocaleDateString("id-ID"),
    tipe: k.tipe,
    jumlah: Number(k.jumlah),
    keterangan: k.keterangan ?? "",
  }));
  const base = process.env.NEXT_PUBLIC_URL ?? "";

  return (
    <div className="space-y-4">
      {canGenerate && <GenerateLaporanButton tenantId={tenantId} tenantNama={tenant.profile?.nama ?? ""} kas={kasRows} />}

      <ul className="space-y-2">
        {laporanList.map((l) => (
          <li key={l.id} className="rounded-md border border-primary/15 p-3 text-sm">
            <p className="font-medium">{l.periode}</p>
            <p className="text-xs text-foreground/60">{l.createdAt.toLocaleDateString("id-ID")}</p>
            <div className="mt-1 flex gap-3 text-xs">
              {l.pdfUrl && (
                <a href={l.pdfUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                  Unduh PDF
                </a>
              )}
              <a href={`${base}/laporan/${l.shareLink}`} className="text-primary underline">
                Link Publik
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
