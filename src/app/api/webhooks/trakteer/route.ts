import { NextResponse } from "next/server";
import { catatDonasi } from "@/lib/trakteer";

/**
 * Callback Trakteer. Daftarkan URL ini di dashboard Trakteer dan samakan
 * TRAKTEER_WEBHOOK_TOKEN dengan token yang dikirim Trakteer di header
 * `X-Webhook-Token`.
 *
 * Pencatatannya sendiri ada di catatDonasi() — sama persis dengan jalur tarikan
 * API di /admin/trakteer, jadi callback yang terlewat tidak bikin data beda.
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-webhook-token");
  if (!process.env.TRAKTEER_WEBHOOK_TOKEN || token !== process.env.TRAKTEER_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "invalid webhook token" }, { status: 401 });
  }

  const hasil = await catatDonasi(await req.json());
  if (hasil.status === "invalid") return NextResponse.json({ error: "order_id wajib" }, { status: 400 });
  if (hasil.status === "duplikat") return NextResponse.json({ ok: true, note: "sudah diproses" });
  return NextResponse.json({ ok: true, tenant: hasil.tenantId, hari: hasil.hari });
}
