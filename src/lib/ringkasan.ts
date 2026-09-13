import { prisma } from "@/lib/prisma";

/**
 * Agregasi angka tenant dipakai bersama oleh Ringkasan (§7.3) dan Laporan (§7.11),
 * supaya angka di dua halaman itu tidak pernah beda rumus.
 */
export async function ringkasanTenant(tenantId: string) {
  const [kas, tabunganTipe, qurbanGroups, arisanList, infaq, kegiatan] = await Promise.all([
    prisma.kasTransaksi.findMany({ where: { tenantId } }),
    prisma.tabunganTipe.findMany({ where: { tenantId }, include: { saldo: true } }),
    prisma.qurbanGroup.findMany({ where: { tenantId }, include: { slots: { include: { user: true } } } }),
    prisma.arisan.findMany({
      where: { tenantId, status: "berjalan" },
      include: { peserta: { include: { user: true }, orderBy: { urutan: "asc" } }, pembayaran: true },
    }),
    prisma.infaqShodaqoh.findMany({ where: { tenantId } }),
    prisma.danaKegiatan.findMany({ where: { tenantId } }),
  ]);

  const kasMasuk = kas.filter((k) => k.tipe === "masuk").reduce((a, k) => a + Number(k.jumlah), 0);
  const kasKeluar = kas.filter((k) => k.tipe === "keluar").reduce((a, k) => a + Number(k.jumlah), 0);
  const keluarDariKas = kegiatan.filter((k) => k.sumberDana === "kas").reduce((a, k) => a + Number(k.jumlah), 0);
  const keluarDariInfaq = kegiatan.filter((k) => k.sumberDana === "infaq").reduce((a, k) => a + Number(k.jumlah), 0);

  const saldoKas = kasMasuk - kasKeluar - keluarDariKas;
  const infaqTotal = infaq.reduce((a, i) => a + Number(i.jumlah), 0);
  const saldoInfaq = infaqTotal - keluarDariInfaq;

  const qurban = qurbanGroups.map((g) => {
    const max = g.jenisHewan === "sapi" ? 7 : 1;
    const lunas = g.slots.filter((s) => s.status === "lunas");
    return {
      id: g.id,
      jenisHewan: g.jenisHewan,
      max,
      terisi: g.slots.length,
      lunasNama: lunas.map((s) => s.user.name),
      selesai: lunas.length === max,
      terkumpul: g.slots.reduce((a, s) => a + Number(s.saldoTerkumpul), 0),
    };
  });

  const arisan = arisanList.map((a) => {
    const bayarPutaran = a.pembayaran.filter((p) => p.putaran === a.putaranBerjalan);
    const berikutnya = a.peserta.find((p) => !p.statusDapat);
    return {
      id: a.id,
      periode: a.periode,
      putaran: a.putaranBerjalan,
      jumlahSetoran: Number(a.jumlahSetoran),
      sudahBayar: bayarPutaran.length,
      totalPeserta: a.peserta.length,
      saldoBerjalan: bayarPutaran.length * Number(a.jumlahSetoran),
      penerimaBerikutnya: berikutnya?.user.name ?? null,
      jadwalTanggal: a.jadwalTanggal,
      jadwalTempat: a.jadwalTempat,
      pesertaUserIds: a.peserta.map((p) => p.userId),
      sudahBayarUserIds: bayarPutaran.map((p) => p.userId),
    };
  });

  return {
    saldoKas,
    kasMasuk,
    kasKeluar: kasKeluar + keluarDariKas + keluarDariInfaq,
    saldoInfaq,
    tabunganTipe,
    qurban,
    qurbanTotal: qurban.reduce((a, q) => a + q.terkumpul, 0),
    arisan,
    kegiatan,
  };
}

/** "Widodo & Arif sudah lunas, masih menunggu 5 orang lagi untuk qurban sapi" (§7.3). */
export function pesanGamifiedQurban(q: { jenisHewan: string; max: number; terisi: number; lunasNama: string[] }) {
  const sisa = q.max - q.lunasNama.length;
  if (sisa <= 0) return `Alhamdulillah, qurban ${q.jenisHewan} sudah lengkap dan lunas.`;
  if (q.lunasNama.length === 0) return `Belum ada yang lunas, dibutuhkan ${sisa} orang lagi untuk qurban ${q.jenisHewan}.`;
  const nama = q.lunasNama.length === 1 ? q.lunasNama[0] : `${q.lunasNama.slice(0, -1).join(", ")} & ${q.lunasNama.at(-1)}`;
  return `${nama} sudah lunas, masih menunggu ${sisa} orang lagi untuk qurban ${q.jenisHewan}.`;
}
