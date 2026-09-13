import { cloudinary } from "@/lib/cloudinary";

/** Uploads a form-submitted image File to Cloudinary, returns its secure URL. */
export async function uploadImage(file: File, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, { folder });
  return uploaded.secure_url;
}
