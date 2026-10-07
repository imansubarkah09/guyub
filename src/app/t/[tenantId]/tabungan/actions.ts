"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, requireMemberWrite, CAN_CATAT_UANG } from "@/lib/authz";
import { catatAudit } from "@/lib/audit-log";
import { uploadImage } from "@/lib/upload";
import { validasiFileGambar } from "@/lib/validasi-file";
import { creditSaldo } from "@/lib/tabungan";
import { createXenditInvoice } from "@/lib/xendit";
import type { TabunganMode } from "@prisma/client";

export async function createTabunganTipeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membership = await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const nama = String(formData.get("nama") ?? "").trim();
  const mode = String(formData.get("mode"));
  if (!nama || (mode !== "individual" && mode !== "pooled")) throw new Error("Nama dan mode wajib diisi");

  await prisma.tabunganTipe.create({ data: { tenantId, nama, mode: mode as TabunganMode } });

  if (membership.roles.includes("pemilik")) {
    await catatAudit({
      tenantId,
      aktorId: user.id,
      peran: "pemilik",
      aksi: "tabungan.tipe_baru",
      deskripsi: `Membuat tipe tabungan baru "${nama}" (${mode})`,
    });
  }

  revalidatePath(`/t/${tenantId}/tabungan`);
}

export async function setorAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membership = await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const tabunganTipeId = String(formData.get("tabunganTipeId"));
  const jumlah = Number(formData.get("jumlah"));
  const targetUserId = String(formData.get("userId") ?? "") || null;
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");

  const tipe = await prisma.tabunganTipe.findUniqueOrThrow({ where: { id: tabunganTipeId } });
  if (tipe.tenantId !== tenantId) throw new Error("Tipe tabungan tidak ditemukan di tenant ini");
  if (tipe.mode === "individual" && !targetUserId) throw new Error("Pilih anggota untuk tabungan individual");

  await creditSaldo(tabunganTipeId, tipe.mode, targetUserId, jumlah);

  if (membership.roles.includes("pemilik")) {
    await catatAudit({
      tenantId,
      aktorId: user.id,
      peran: "pemilik",
      aksi: "tabungan.setor",
      deskripsi: `Mencatat setoran tabungan "${tipe.nama}" sebesar Rp ${jumlah}`,
      nominal: jumlah,
    });
  }

  revalidatePath(`/t/${tenantId}/tabungan`);
}

export type SetoranBuktiActionState = { error: string } | null;

/**
 * Fase 4 (§5) — anggota mana pun bisa mengajukan setoran transfer dengan bukti foto; belum
 * menambah saldo sampai divalidasi. Upload & write dibalikin sebagai {error}, bukan throw
 * mentah (lihat kas/actions.ts untuk alasannya).
 */
export async function submitSetoranBuktiAction(_prevState: SetoranBuktiActionState, formData: FormData): Promise<SetoranBuktiActionState> {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMemberWrite(user, tenantId);

  const tabunganTipeId = String(formData.get("tabunganTipeId"));
  const jumlah = Number(formData.get("jumlah"));
  const bukti = formData.get("bukti");
  if (!jumlah || jumlah <= 0) return { error: "Jumlah setoran wajib lebih dari 0" };
  if (!(bukti instanceof File) || bukti.size === 0) return { error: "Foto bukti transfer wajib diunggah" };
  const pesanValidasi = validasiFileGambar(bukti);
  if (pesanValidasi) return { error: pesanValidasi };

  const tipe = await prisma.tabunganTipe.findUniqueOrThrow({ where: { id: tabunganTipeId } });
  if (tipe.tenantId !== tenantId) throw new Error("Tipe tabungan tidak ditemukan di tenant ini");

  try {
    const buktiUrl = await uploadImage(bukti, `guyub/tabungan/${tenantId}`);
    await prisma.tabunganSetoran.create({ data: { tabunganTipeId, userId: user.id, jumlah, buktiUrl } });
  } catch (e) {
    console.error("Ajukan setoran bukti tabungan gagal", e);
    return { error: "Gagal mengunggah bukti atau menyimpan setoran. Coba lagi." };
  }

  revalidatePath(`/t/${tenantId}/tabungan`);
  return null;
}

/** Fase 5 (§8) — bayar langsung lewat Xendit, tervalidasi otomatis oleh webhook saat invoice lunas (lihat api/webhooks/xendit). */
export async function submitSetoranXenditAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireMemberWrite(user, tenantId);

  const tabunganTipeId = String(formData.get("tabunganTipeId"));
  const jumlah = Number(formData.get("jumlah"));
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah setoran wajib lebih dari 0");

  const tipe = await prisma.tabunganTipe.findUniqueOrThrow({ where: { id: tabunganTipeId } });
  if (tipe.tenantId !== tenantId) throw new Error("Tipe tabungan tidak ditemukan di tenant ini");

  const setoran = await prisma.tabunganSetoran.create({ data: { tabunganTipeId, userId: user.id, jumlah, metode: "xendit" } });
  const base = process.env.NEXT_PUBLIC_URL ?? "";
  const invoice = await createXenditInvoice({
    externalId: setoran.id,
    amount: jumlah,
    payerEmail: user.email,
    description: `Setoran ${tipe.nama}`,
    successRedirectUrl: `${base}/t/${tenantId}/tabungan`,
  });
  await prisma.tabunganSetoran.update({
    where: { id: setoran.id },
    data: { xenditInvoiceId: invoice.id, xenditInvoiceUrl: invoice.invoice_url },
  });

  redirect(invoice.invoice_url);
}

export async function validasiSetoranAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  const membership = await requireWrite(user, tenantId, CAN_CATAT_UANG);

  const setoranId = String(formData.get("setoranId"));
  const decision = String(formData.get("decision"));
  if (decision !== "valid" && decision !== "ditolak") throw new Error("Keputusan tidak valid");

  const setoran = await prisma.tabunganSetoran.findUniqueOrThrow({ where: { id: setoranId }, include: { tabunganTipe: true } });
  if (setoran.tabunganTipe.tenantId !== tenantId) throw new Error("Setoran tidak ditemukan di tenant ini");
  if (setoran.status !== "pending") throw new Error("Setoran ini sudah diproses");
  if (setoran.metode === "xendit") throw new Error("Setoran Xendit tervalidasi otomatis, tidak divalidasi manual");

  if (decision === "valid") {
    await creditSaldo(setoran.tabunganTipeId, setoran.tabunganTipe.mode, setoran.userId, Number(setoran.jumlah));
  }
  await prisma.tabunganSetoran.update({
    where: { id: setoranId },
    data: { status: decision, divalidasiOlehId: user.id },
  });

  if (membership.roles.includes("pemilik")) {
    await catatAudit({
      tenantId,
      aktorId: user.id,
      peran: "pemilik",
      aksi: "tabungan.validasi",
      deskripsi: `Memvalidasi setoran tabungan ${setoranId}: ${decision}`,
      nominal: decision === "valid" ? Number(setoran.jumlah) : undefined,
    });
  }

  revalidatePath(`/t/${tenantId}/tabungan`);
}
