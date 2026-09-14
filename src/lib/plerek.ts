import { prisma } from "@/lib/prisma";

/**
 * Saldo pot Plerek: uang dan stok beras.
 *
 * Sengaja TIDAK ditaruh di `angkaTenant()` walau bentuknya mirip. angkaTenant
 * dipanggil enam halaman, dan menaruh tiga agregat plerek di sana berarti setiap
 * halaman tenant membayar query yang cuma dibutuhkan halaman Plerek dan Dana
 * Kegiatan — persis kebiasaan yang dibereskan audit 14 Sep 2026.
 *
 * Uang dan beras dihitung dengan aturan berbeda, jadi jangan dijumlahkan:
 * - uang  = hasil keliling + hasil penjualan beras − disetor ke Kas − dipakai kegiatan
 * - beras = terkumpul − keluar (dijual maupun dibagikan), satuannya kilogram
 */
export async function angkaPlerek(tenantId: string) {
  const [masuk, berasKeluar, keKas, kegiatan] = await Promise.all([
    prisma.plerekPutaran.aggregate({ where: { tenantId }, _sum: { jumlahUang: true, berasKg: true } }),
    prisma.plerekBerasKeluar.aggregate({ where: { tenantId }, _sum: { berasKg: true, hasilPenjualan: true } }),
    prisma.plerekSetoranKas.aggregate({ where: { tenantId }, _sum: { jumlah: true } }),
    prisma.danaKegiatanSumber.aggregate({ where: { sumberDana: "plerek", kegiatan: { tenantId } }, _sum: { jumlah: true } }),
  ]);

  const n = (v: unknown) => Number(v ?? 0);
  const uangKeliling = n(masuk._sum.jumlahUang);
  const hasilJualBeras = n(berasKeluar._sum.hasilPenjualan);
  const disetorKeKas = n(keKas._sum.jumlah);
  const dipakaiKegiatan = n(kegiatan._sum.jumlah);

  return {
    uangKeliling,
    hasilJualBeras,
    disetorKeKas,
    dipakaiKegiatan,
    saldoUang: uangKeliling + hasilJualBeras - disetorKeKas - dipakaiKegiatan,
    berasMasukKg: n(masuk._sum.berasKg),
    berasKeluarKg: n(berasKeluar._sum.berasKg),
    stokBerasKg: n(masuk._sum.berasKg) - n(berasKeluar._sum.berasKg),
  };
}

/** "12,5 kg" — beras boleh pecahan, tapi nol di belakang koma tidak perlu ditampilkan. */
export const kilogram = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
