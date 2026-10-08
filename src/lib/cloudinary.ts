/**
 * Upload lewat fetch() langsung ke REST API Cloudinary, BUKAN paket npm
 * `cloudinary` resmi. Root cause ketemu 16 Sep 2026: SDK itu (execute_request.js)
 * SELALU kirim request pakai `https.request` Node mentah, dan runtime Cloudflare
 * Workers (unenv) tidak mengimplementasikan itu sama sekali, gagal dengan
 * "[unenv] https.request is not implemented yet!" di SETIAP upload (bukti
 * transfer Kas maupun PDF Laporan, dua-duanya lewat fungsi yang sama). fetch()
 * didukung penuh di Workers, jadi upload signed dibangun manual di sini pakai
 * Web Crypto (SHA-1) buat signature, bukan modul Node.
 */

function parseCloudinaryUrl() {
  const url = process.env.CLOUDINARY_URL;
  if (!url) throw new Error("CLOUDINARY_URL belum diisi");
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) throw new Error("CLOUDINARY_URL formatnya tidak valid");
  const [, apiKey, apiSecret, cloudName] = match;
  return { apiKey, apiSecret, cloudName };
}

async function sha1Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * @param dataUri File sebagai data URI (`data:<mime>;base64,...`), Cloudinary
 *   menerima ini langsung sebagai nilai field `file`, tidak perlu encode multipart manual.
 */
export async function uploadToCloudinary(
  dataUri: string,
  opts: { folder: string; resourceType?: "image" | "auto" | "raw" | "video" },
): Promise<{ secure_url: string }> {
  const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl();
  const resourceType = opts.resourceType ?? "image";
  const timestamp = Math.floor(Date.now() / 1000);

  // Aturan Cloudinary: tanda tangan cuma dari parameter selain file/api_key/signature,
  // diurutkan alfabetis lalu digabung "key=value&...", ditambah api_secret di akhir.
  const toSign = `folder=${opts.folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = await sha1Hex(toSign);

  const form = new FormData();
  form.set("file", dataUri);
  form.set("folder", opts.folder);
  form.set("timestamp", String(timestamp));
  form.set("api_key", apiKey);
  form.set("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: "POST", body: form });
  const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message ?? `Upload Cloudinary gagal (HTTP ${res.status})`);
  }
  return { secure_url: json.secure_url };
}

/**
 * Ambil file dari Cloudinary lewat Download API bertanda tangan, bukan URL
 * res.cloudinary.com biasa. Akun ini memblokir delivery publik file PDF
 * (HTTP 401 "deny or ACL failure", juga untuk resource raw berakhiran .pdf),
 * sedangkan Download API tetap jalan karena memakai api_secret.
 *
 * @param secureUrl URL yang disimpan saat upload, bentuknya
 *   `https://res.cloudinary.com/<cloud>/<resource>/<type>/v<versi>/<public_id>.<format>`.
 */
export async function downloadFromCloudinary(secureUrl: string): Promise<Response> {
  const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl();
  const match = new URL(secureUrl).pathname.match(/^\/[^/]+\/([^/]+)\/([^/]+)\/v\d+\/(.+)\.([a-z0-9]+)$/i);
  if (!match) throw new Error("URL Cloudinary tidak dikenali");
  const [, resourceType, type, publicId, format] = match;
  const timestamp = Math.floor(Date.now() / 1000);

  // Parameter diurutkan alfabetis, aturan tanda tangan sama dengan upload di atas.
  const params = `format=${format}&public_id=${publicId}&timestamp=${timestamp}&type=${type}`;
  const signature = await sha1Hex(`${params}${apiSecret}`);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/download?${params}&api_key=${apiKey}&signature=${signature}`,
  );
  if (!res.ok) throw new Error(`Unduh dari Cloudinary gagal (HTTP ${res.status})`);
  return res;
}
