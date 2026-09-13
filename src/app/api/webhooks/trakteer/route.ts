import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cariTenantDariPesan, hariDariNominal, tambahNyawa } from "@/lib/trakteer";
import { notifyTenant } from "@/lib/notifikasi";

/**
 * Callback Trakteer. Daftarkan URL ini di dashboard Trakteer dan samakan
 * TRAKTEER_WEBHOOK_TOKEN dengan token yang dikirim Trakteer di header
 * `X-Webhook-Token`.
 *
 * `order_id` disimpan unik: callback yang dikirim ulang tidak menambah nyawa
 * dua kali.
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-webhook-token");
  if (!process.env.TRAKTEER_WEBHOOK_TOKEN || token !== process.env.TRAKTEER_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "invalid webhook token" }, { status: 401 });
  }

  const body = (await req.json()) as {
    order_id?: string;
    supporter_name?: string;
    supporter_message?: string;
    quantity?: number;
    price?: number;
    net_amount?: number;
  };

  const orderId = body.order_id;
  if (!orderId) return NextResponse.json({ error: "order_id wajib" }, { status: 400 });

  const sudahAda = await prisma.trakteerDonasi.findUnique({ where: { orderId } });
  if (sudahAda) return NextResponse.json({ ok: true, note: "sudah diproses" });

  const jumlah = Number(body.net_amount ?? (body.price ?? 0) * (body.quantity ?? 1));
  const hari = hariDariNominal(jumlah);
  const tenant = await cariTenantDariPesan(body.supporter_message);

  await prisma.trakteerDonasi.create({
    data: {
      orderId,
      tenantId: tenant?.id ?? null,
      namaDonatur: body.supporter_name?.trim() || "Anonim",
      pesan: body.supporter_message ?? null,
      jumlah,
      hariNyawa: hari,
    },
  });

  if (tenant) {
    const sampai = await tambahNyawa(tenant.id, hari);
    await notifyTenant(
      tenant.id,
      "trakteer",
      `${body.supporter_name?.trim() || "Seseorang"} mendukung tenant ini (+${hari} hari). Aktif sampai ${sampai.toLocaleDateString("id-ID")}`,
      { href: `/t/${tenant.id}` },
    );
  }

  return NextResponse.json({ ok: true, tenant: tenant?.id ?? null, hari });
}
