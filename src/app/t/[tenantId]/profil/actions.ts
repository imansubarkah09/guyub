"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_UPDATE_PROFIL } from "@/lib/authz";
import { uploadImage } from "@/lib/upload";

export async function updateProfilAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_UPDATE_PROFIL);

  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim() || null;
  if (!nama) throw new Error("Nama tenant wajib diisi");

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    logoUrl = await uploadImage(logo, `guyub/tenant/${tenantId}`);
  }

  await prisma.tenantProfile.update({
    where: { tenantId },
    data: { nama, alamat, ...(logoUrl ? { logoUrl } : {}) },
  });

  revalidatePath(`/t/${tenantId}/profil`);
  revalidatePath(`/t/${tenantId}`);
}
