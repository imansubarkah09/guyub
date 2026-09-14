import { prisma } from "@/lib/prisma";

/**
 * Angka agregat tenant. Dijumlah di SQL, BUKAN dengan menarik semua baris lalu
 * reduce() di JavaScript (versi lama begitu, dan itu penyebab CPU/memori Worker
 * membengkak: satu kali buka halaman menarik seluruh riwayat kas, infaq, qurban,
 * dan donasi kegiatan tenant — biayanya naik terus seiring umur tenant).
 *
 * Dipisah dari ringkasanTenant() karena lima dari enam pemanggil cuma butuh
 * angkanya, tidak butuh barisnya. Rumusnya tetap satu tempat, jadi angka di
 * Dashboard, Kas, Infaq, Laporan, dan Dana Kegiatan tidak mungkin beda.
 */
export async function angkaTenant(tenantId: string) {
  const [kas, infaq, sumber, qurban] = await Promise.all([
    prisma.kasTransaksi.groupBy({ by: ["tipe"], where: { tenantId }, _sum: { jumlah: true } }),
    prisma.infaqShodaqoh.aggregate({ where: { tenantId }, _sum: { jumlah: true } }),
    // Satu kegiatan bisa menarik dari beberapa pool sekaligus, jadi dijumlah per baris sumber.
    prisma.danaKegiatanSumber.groupBy({ by: ["sumberDana"], where: { kegiatan: { tenantId } }, _sum: { jumlah: true } }),
    prisma.qurbanSlot.aggregate({ where: { qurbanGroup: { tenantId } }, _sum: { saldoTerkumpul: true } }),
  ]);

  const angka = (v: unknown) => Number(v ?? 0);
  const kasMasuk = angka(kas.find((k) => k.tipe === "masuk")?._sum.jumlah);
  const kasKeluar = angka(kas.find((k) => k.tipe === "keluar")?._sum.jumlah);
  const keluarDariKas = angka(sumber.find((s) => s.sumberDana === "kas")?._sum.jumlah);
  const keluarDariInfaq = angka(sumber.find((s) => s.sumberDana === "infaq")?._sum.jumlah);
  const infaqMasuk = angka(infaq._sum.jumlah);

  return {
    kasMasuk,
    kasKeluar: kasKeluar + keluarDariKas + keluarDariInfaq,
    saldoKas: kasMasuk - kasKeluar - keluarDariKas,
    infaqMasuk,
    infaqKeluar: keluarDariInfaq,
    saldoInfaq: infaqMasuk - keluarDariInfaq,
    keluarDariKas,
    qurbanTotal: angka(qurban._sum.saldoTerkumpul),
  };
}

/** Uang yang sudah masuk di putaran yang sedang berjalan — dipakai Dashboard & Laporan. */
export function saldoBerjalanArisan(a: { putaranBerjalan: number; jumlahSetoran: unknown; pembayaran: { putaran: number }[] }) {
  return a.pembayaran.filter((p) => p.putaran === a.putaranBerjalan).length * Number(a.jumlahSetoran);
}

/**
 * Angka + baris yang hanya dibutuhkan Dashboard (§7.3). Baris yang diambil di sini
 * dibatasi jumlah anggota/kelompok (puluhan), bukan jumlah transaksi (ribuan):
 * pembayaran arisan sengaja diambil hanya untuk putaran yang sedang berjalan,
 * dan kolom User dipangkas ke nama saja.
 */
export async function ringkasanTenant(tenantId: string) {
  const [angka, tabunganTipe, qurbanGroups, arisanList] = await Promise.all([
    angkaTenant(tenantId),
    prisma.tabunganTipe.findMany({
      where: { tenantId },
      select: { id: true, nama: true, mode: true, saldo: { select: { userId: true, jumlah: true } } },
    }),
    prisma.qurbanGroup.findMany({
      where: { tenantId },
      select: { id: true, jenisHewan: true, slots: { select: { status: true, saldoTerkumpul: true, user: { select: { name: true } } } } },
    }),
    prisma.arisan.findMany({
      where: { tenantId, status: "berjalan" },
      select: {
        id: true,
        periode: true,
        putaranBerjalan: true,
        jumlahSetoran: true,
        jadwalTanggal: true,
        jadwalTempat: true,
        peserta: { select: { userId: true, statusDapat: true, user: { select: { name: true } } }, orderBy: { urutan: "asc" } },
      },
    }),
  ]);

  // Pembayaran diambil terpisah supaya bisa disaring ke putaran berjalan saja:
  // include bersarang tidak bisa menyaring pakai nilai kolom baris induknya.
  const pembayaran = arisanList.length
    ? await prisma.arisanPembayaran.findMany({
        where: { OR: arisanList.map((a) => ({ arisanId: a.id, putaran: a.putaranBerjalan })) },
        select: { arisanId: true, userId: true, putaran: true },
      })
    : [];

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
    const bayarPutaran = pembayaran.filter((p) => p.arisanId === a.id);
    const berikutnya = a.peserta.find((p) => !p.statusDapat);
    return {
      id: a.id,
      periode: a.periode,
      putaran: a.putaranBerjalan,
      jumlahSetoran: Number(a.jumlahSetoran),
      sudahBayar: bayarPutaran.length,
      totalPeserta: a.peserta.length,
      saldoBerjalan: saldoBerjalanArisan({ ...a, pembayaran: bayarPutaran }),
      penerimaBerikutnya: berikutnya?.user.name ?? null,
      jadwalTanggal: a.jadwalTanggal,
      jadwalTempat: a.jadwalTempat,
      pesertaUserIds: a.peserta.map((p) => p.userId),
      sudahBayarUserIds: bayarPutaran.map((p) => p.userId),
    };
  });

  return { ...angka, tabunganTipe, qurban, arisan };
}

/** "Widodo & Arif sudah lunas, masih menunggu 5 orang lagi untuk qurban sapi" (§7.3). */
export function pesanGamifiedQurban(q: { jenisHewan: string; max: number; terisi: number; lunasNama: string[] }) {
  if (q.lunasNama.length === q.max) return `Alhamdulillah, qurban ${q.jenisHewan} sudah lengkap dan lunas.`;

  const sisaSlot = q.max - q.terisi;
  if (sisaSlot <= 0) {
    const belumLunas = q.max - q.lunasNama.length;
    return q.lunasNama.length === 0
      ? `Sudah ${q.max} orang join qurban ${q.jenisHewan}, belum ada yang lunas.`
      : `${q.lunasNama.length} dari ${q.max} orang sudah lunas untuk qurban ${q.jenisHewan}, menunggu ${belumLunas} orang lagi melunasi.`;
  }

  if (q.lunasNama.length === 0) return `Belum ada yang lunas, dibutuhkan ${sisaSlot} orang lagi untuk qurban ${q.jenisHewan}.`;
  const nama = q.lunasNama.length === 1 ? q.lunasNama[0] : `${q.lunasNama.slice(0, -1).join(", ")} & ${q.lunasNama.at(-1)}`;
  return `${nama} sudah lunas, masih menunggu ${sisaSlot} orang lagi untuk qurban ${q.jenisHewan}.`;
}
