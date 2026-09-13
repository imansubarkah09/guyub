"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMembership, CAN_UPDATE_PROFIL } from "@/lib/authz";
import { cloudinary } from "@/lib/cloudinary";

export async function updateProfilAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMembership(user.id, tenantId, CAN_UPDATE_PROFIL);

  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim() || null;
  if (!nama) throw new Error("Nama tenant wajib diisi");

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const buffer = Buffer.from(await logo.arrayBuffer());
    const dataUri = `data:${logo.type};base64,${buffer.toString("base64")}`;
    const uploaded = await cloudinary.uploader.upload(dataUri, { folder: `guyub/tenant/${tenantId}` });
    logoUrl = uploaded.secure_url;
  }

  await prisma.tenantProfile.update({
    where: { tenantId },
    data: { nama, alamat, ...(logoUrl ? { logoUrl } : {}) },
  });

  revalidatePath(`/t/${tenantId}/profil`);
  revalidatePath(`/t/${tenantId}`);
}
