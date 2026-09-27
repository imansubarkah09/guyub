import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { TIMEZONE_WIB } from "@/lib/waktu";
import { PageTitle } from "@/components/ui";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "Notifikasi" };

const PENDEK = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE_WIB });
const PANJANG = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIMEZONE_WIB,
});

/** Notifikasi milik akun (lintas tenant, sama dengan isi lonceng), dibaca ala inbox email. */
export default async function NotifikasiPage() {
  const user = await requireUser();
  // ponytail: 200 terbaru lalu dipaginasi di klien. Pindah ke paginasi server kalau ada akun yang menumpuk ribuan.
  const rows = await prisma.notifikasi.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, pesan: true, href: true, isRead: true, createdAt: true, tenant: { select: { profile: { select: { nama: true } } } } },
  });

  return (
    <div className="space-y-5">
      <PageTitle title="Notifikasi" desc="Semua kabar dari tenant yang Anda ikuti." />
      <Inbox
        items={rows.map((r) => ({
          id: r.id,
          pesan: r.pesan,
          href: r.href,
          isRead: r.isRead,
          tanggal: PANJANG.format(r.createdAt),
          tanggalPendek: PENDEK.format(r.createdAt),
          tenantNama: r.tenant?.profile?.nama ?? null,
        }))}
      />
    </div>
  );
}
