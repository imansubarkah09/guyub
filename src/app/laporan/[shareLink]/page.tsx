import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function LaporanPublicPage({ params }: { params: Promise<{ shareLink: string }> }) {
  const { shareLink } = await params;
  const laporan = await prisma.laporan.findUnique({ where: { shareLink }, include: { tenant: { include: { profile: true } } } });
  if (!laporan) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">Laporan {laporan.tenant.profile?.nama}</h1>
      <p className="text-sm text-foreground/60">
        Periode {laporan.periode} · diterbitkan {laporan.createdAt.toLocaleDateString("id-ID")}
      </p>
      {laporan.pdfUrl && (
        <a href={laporan.pdfUrl} target="_blank" rel="noreferrer" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Buka / Unduh PDF
        </a>
      )}
    </main>
  );
}
