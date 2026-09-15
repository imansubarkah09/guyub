"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_UPDATE_PROFIL } from "@/lib/authz";
import { uploadImage } from "@/lib/upload";
import { validasiFileGambar } from "@/lib/validasi-file";

export type ProfilActionState = { error: string } | null;

/** Upload logo & write DB dibungkus try/catch, bukan throw mentah (lihat kas/actions.ts untuk alasannya). */
export async function updateProfilAction(_prevState: ProfilActionState, formData: FormData): Promise<ProfilActionState> {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_UPDATE_PROFIL);

  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim() || null;
  if (!nama) return { error: "Nama tenant wajib diisi" };

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const pesanValidasi = validasiFileGambar(logo);
    if (pesanValidasi) return { error: pesanValidasi };
    try {
      logoUrl = await uploadImage(logo, `guyub/tenant/${tenantId}`);
    } catch (e) {
      console.error("Upload logo tenant gagal", e);
      return { error: "Gagal mengunggah logo. Coba lagi atau pakai file lain." };
    }
  }

  try {
    await prisma.tenantProfile.update({
      where: { tenantId },
      data: { nama, alamat, ...(logoUrl ? { logoUrl } : {}) },
    });
  } catch (e) {
    console.error("Simpan profil tenant gagal", e);
    return { error: "Gagal menyimpan profil tenant. Coba lagi." };
  }

  revalidatePath(`/t/${tenantId}/profil`);
  revalidatePath(`/t/${tenantId}`);
  return null;
}
