import { v2 as cloudinary } from "cloudinary";

/**
 * Configures the Cloudinary SDK from env vars. Upload flows (logo tenant,
 * foto profil, bukti transfer) land in later fases — this just wires the
 * credentials so `cloudinary.uploader.upload(...)` works wherever it's needed.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
