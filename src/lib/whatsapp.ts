/**
 * WhatsApp "share" deep link — no WhatsApp Business API, no per-message cost,
 * no Meta approval. The user reviews and sends the message themselves from
 * their own WhatsApp, which is also what spec §4.1 requires (pengurus shares
 * the invite manually, not a system broadcast).
 */
export function waShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
