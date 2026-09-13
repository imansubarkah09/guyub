import { v2 as cloudinary } from "cloudinary";

/**
 * The SDK auto-configures itself from the CLOUDINARY_URL env var on import —
 * no explicit .config() needed. Upload flows (logo tenant, foto profil, bukti
 * transfer) land in later fases, this just wires the credentials so
 * `cloudinary.uploader.upload(...)` works wherever it's needed.
 */
export { cloudinary };
