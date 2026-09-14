import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creditSaldo } from "@/lib/tabungan";
import { tokenCocok } from "@/lib/webhook-auth";

/**
 * Xendit invoice callback. Configure this URL as the Invoice Callback in the
 * Xendit dashboard, with the same value as XENDIT_CALLBACK_TOKEN as its
 * verification token — Xendit echoes it back in the `x-callback-token`
 * header on every call, which is how we know the request is really Xendit
 * and not someone POSTing a fake "PAID" status.
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-callback-token");
  if (!tokenCocok(token, process.env.XENDIT_CALLBACK_TOKEN)) {
    return NextResponse.json({ error: "invalid callback token" }, { status: 401 });
  }

  const body = (await req.json()) as { id: string; status: string };

  const setoran = await prisma.tabunganSetoran.findUnique({
    where: { xenditInvoiceId: body.id },
    include: { tabunganTipe: true },
  });
  if (!setoran || setoran.status !== "pending") {
    return NextResponse.json({ ok: true }); // unknown or already-processed invoice, nothing to do
  }

  if (body.status === "PAID" || body.status === "SETTLED") {
    await creditSaldo(setoran.tabunganTipeId, setoran.tabunganTipe.mode, setoran.userId, Number(setoran.jumlah));
    await prisma.tabunganSetoran.update({ where: { id: setoran.id }, data: { status: "valid" } });
  } else if (body.status === "EXPIRED") {
    await prisma.tabunganSetoran.update({
      where: { id: setoran.id },
      data: { status: "ditolak", catatanBendahara: "Invoice Xendit kedaluwarsa" },
    });
  }

  return NextResponse.json({ ok: true });
}
