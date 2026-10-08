import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { effectiveRoles } from "@/lib/effective-roles";
import { downloadFromCloudinary } from "@/lib/cloudinary";

/**
 * PDF laporan terbit, disajikan lewat Guyub karena link res.cloudinary.com
 * langsung ditolak Cloudinary (HTTP 401, delivery PDF diblokir di akun ini).
 * Hak aksesnya sama dengan daftar "Laporan Terbit": anggota tenant, termasuk
 * platform owner saat Preview.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ tenantId: string; laporanId: string }> }) {
  const { tenantId, laporanId } = await params;
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);
  if (roles.length === 0) notFound();

  const laporan = await prisma.laporan.findFirst({ where: { id: laporanId, tenantId }, select: { periode: true, pdfUrl: true } });
  if (!laporan?.pdfUrl) notFound();

  try {
    const file = await downloadFromCloudinary(laporan.pdfUrl);
    const namaFile = encodeURIComponent(`Laporan ${laporan.periode}.pdf`);
    return new Response(file.body, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename*=UTF-8''${namaFile}`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("Ambil PDF laporan gagal", e);
    return new Response("Gagal mengambil PDF laporan. Coba lagi.", { status: 502 });
  }
}
