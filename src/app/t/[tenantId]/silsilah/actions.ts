"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireWrite, CAN_KELOLA_ANGGOTA } from "@/lib/authz";

/**
 * Pasangan itu simetris: kalau A menikah dengan B, maka B juga menikah dengan A.
 * `spouseId` unik, jadi menautkan pasangan yang sudah menikah dengan orang lain
 * hanya boleh dilakukan setelah SEMUA penunjuk lama dilepas.
 *
 * Pelepasannya sengaja pakai updateMany berdasarkan NILAI, bukan lewat relasi
 * `spouseOf` yang dibaca duluan (ketemu 13 Sep 2026, error 500 P2002 di layar
 * pengguna). Membaca dulu lalu menulis berdasarkan hasil bacaan itu balapan:
 * kalau ada kiriman lain menulis di sela baca dan tulis, penunjuk yang baru
 * tidak ikut terbaca dan UPDATE terakhir menabrak unique constraint. Melepas
 * berdasarkan nilai di dalam transaksi yang sama tidak bisa meleset seperti itu.
 */
async function setPasangan(nodeId: string, spouseId: string | null) {
  const [node, calon] = await Promise.all([
    prisma.familyNode.findUniqueOrThrow({ where: { id: nodeId } }),
    spouseId ? prisma.familyNode.findUnique({ where: { id: spouseId } }) : null,
  ]);
  if (spouseId && !calon) throw new Error("Pasangan yang dipilih tidak ditemukan");
  if (calon && calon.tenantId !== node.tenantId) throw new Error("Pasangan harus dari tenant yang sama");

  const terlibat = [nodeId, spouseId].filter((x): x is string => Boolean(x));

  await prisma.$transaction([
    // siapa pun yang menunjuk salah satu dari keduanya, dilepas
    prisma.familyNode.updateMany({ where: { spouseId: { in: terlibat } }, data: { spouseId: null } }),
    // dan keduanya melepas pasangan lamanya sendiri
    prisma.familyNode.updateMany({ where: { id: { in: terlibat } }, data: { spouseId: null } }),
    ...(spouseId
      ? [
          prisma.familyNode.update({ where: { id: nodeId }, data: { spouseId } }),
          prisma.familyNode.update({ where: { id: spouseId }, data: { spouseId: nodeId } }),
        ]
      : []),
  ]);
}

/**
 * P2002 di silsilah selalu berarti rebutan pasangan (spouseId unik). Tanpa ini
 * pengguna cuma melihat layar "Terjadi kesalahan" merah tanpa tahu apa sebabnya.
 */
async function ramahkanErrorPasangan<T>(jalankan: () => Promise<T>): Promise<T> {
  try {
    return await jalankan();
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      throw new Error("Pasangan itu barusan diubah dari tempat lain. Muat ulang halaman lalu coba lagi.");
    }
    throw e;
  }
}

/** Cegah lingkaran: X tidak boleh menjadikan keturunannya sendiri sebagai orang tua. */
async function assertBukanKeturunan(nodeId: string, parentId: string | null) {
  if (!parentId) return;
  let cur: string | null = parentId;
  const dilihat = new Set<string>();
  while (cur && !dilihat.has(cur)) {
    if (cur === nodeId) throw new Error("Orang tua tidak boleh diambil dari keturunannya sendiri");
    dilihat.add(cur);
    const p: { parentId: string | null } | null = await prisma.familyNode.findUnique({
      where: { id: cur },
      select: { parentId: true },
    });
    cur = p?.parentId ?? null;
  }
}

/**
 * Akun yang ditautkan wajib anggota aktif tenant ini. Tanpa cek ini, siapa pun
 * yang boleh mengelola anggota bisa menautkan node ke akun orang di tenant lain.
 */
async function assertAnggotaTenant(userId: string | null, tenantId: string) {
  if (!userId) return;
  const m = await prisma.membership.findUnique({ where: { userId_tenantId: { userId, tenantId } } });
  if (!m || m.status !== "active") throw new Error("Akun itu bukan anggota aktif tenant ini");
}

/** "Anak ke" kosong berarti belum diatur, bukan nol. */
function bacaUrutan(formData: FormData) {
  const raw = String(formData.get("urutan") ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new Error("Anak ke- harus angka bulat mulai dari 1");
  return n;
}

export async function addFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) throw new Error("Nama wajib diisi");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const spouseId = String(formData.get("spouseId") ?? "") || null;
  const userId = String(formData.get("userId") ?? "") || null;
  const urutan = bacaUrutan(formData);
  await assertAnggotaTenant(userId, tenantId);

  const node = await prisma.familyNode.create({ data: { tenantId, nama, parentId, userId, urutan } });
  if (spouseId) await ramahkanErrorPasangan(() => setPasangan(node.id, spouseId));

  revalidatePath(`/t/${tenantId}/silsilah`);
}

export async function updateFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const nodeId = String(formData.get("nodeId"));
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) throw new Error("Nama wajib diisi");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const spouseId = String(formData.get("spouseId") ?? "") || null;
  if (parentId === nodeId) throw new Error("Tidak bisa jadi orang tua sendiri");
  if (spouseId === nodeId) throw new Error("Tidak bisa jadi pasangan sendiri");

  const userId = String(formData.get("userId") ?? "") || null;
  const urutan = bacaUrutan(formData);

  const node = await prisma.familyNode.findUniqueOrThrow({ where: { id: nodeId }, include: { spouseOf: true } });
  if (node.tenantId !== tenantId) throw new Error("Data silsilah tidak ditemukan di tenant ini");
  await assertBukanKeturunan(nodeId, parentId);
  await assertAnggotaTenant(userId, tenantId);


  await prisma.familyNode.update({ where: { id: nodeId }, data: { nama, parentId, userId, urutan } });

  // Pasangan efektif node ini bisa tersimpan di kedua arah, jadi bandingkan keduanya.
  const pasanganSekarang = node.spouseId ?? node.spouseOf[0]?.id ?? null;
  if (pasanganSekarang !== spouseId) await ramahkanErrorPasangan(() => setPasangan(nodeId, spouseId));

  revalidatePath(`/t/${tenantId}/silsilah`);
}

/**
 * Hapus satu orang dari silsilah tanpa merusak pohonnya: pasangan dilepas dua
 * arah, lalu anak-anaknya dinaikkan ke orang tua node ini (jadi cucu menjadi
 * anak langsung kakeknya). Kalau anaknya dibiarkan, parentId mereka menunjuk
 * baris yang sudah hilang dan seluruh cabang lenyap dari tampilan.
 */
export async function deleteFamilyNodeAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId"));
  await requireWrite(user, tenantId, CAN_KELOLA_ANGGOTA);

  const nodeId = String(formData.get("nodeId"));
  const node = await prisma.familyNode.findUniqueOrThrow({ where: { id: nodeId }, include: { spouseOf: true } });
  if (node.tenantId !== tenantId) throw new Error("Data silsilah tidak ditemukan di tenant ini");

  await ramahkanErrorPasangan(() => setPasangan(nodeId, null));
  await prisma.$transaction([
    prisma.familyNode.updateMany({ where: { parentId: nodeId }, data: { parentId: node.parentId } }),
    prisma.familyNode.delete({ where: { id: nodeId } }),
  ]);

  revalidatePath(`/t/${tenantId}/silsilah`);
}
