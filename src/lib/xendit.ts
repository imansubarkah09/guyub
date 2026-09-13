/**
 * Xendit's REST API is a single POST for what we need (create an Invoice),
 * so this skips the xendit-node SDK — one fetch call doesn't need a whole
 * client library. https://developers.xendit.co/api-reference/#create-invoice
 */
export async function createXenditInvoice(params: {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  successRedirectUrl: string;
}) {
  const auth = Buffer.from(`${process.env.XENDIT_API_KEY}:`).toString("base64");
  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: params.externalId,
      amount: params.amount,
      payer_email: params.payerEmail,
      description: params.description,
      success_redirect_url: params.successRedirectUrl,
    }),
  });
  if (!res.ok) throw new Error(`Gagal membuat invoice Xendit: ${await res.text()}`);
  return res.json() as Promise<{ id: string; invoice_url: string }>;
}
