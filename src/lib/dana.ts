import { prisma } from "@/lib/prisma";
import { ringkasanTenant } from "@/lib/ringkasan";
import type { SumberDana } from "@prisma/client";

/** Saldo pool sumber dana saat ini — dipakai untuk validasi & dropdown Dana Kegiatan (§7.9). */
export async function saldoPool(tenantId: string, sumber: SumberDana, tabunganTipeId: string | null) {
  if (sumber === "tabungan") {
    if (!tabunganTipeId) return 0;
    const saldo = await prisma.tabunganSaldo.findMany({ where: { tabunganTipeId } });
    return saldo.reduce((a, s) => a + Number(s.jumlah), 0);
  }
  const r = await ringkasanTenant(tenantId);
  return sumber === "kas" ? r.saldoKas : r.saldoInfaq;
}

/** Semua pool yang bisa dipilih sebagai sumber dana, lengkap dengan saldonya. */
export async function daftarPool(tenantId: string) {
  const [r, tipeList] = await Promise.all([
    ringkasanTenant(tenantId),
    prisma.tabunganTipe.findMany({ where: { tenantId }, include: { saldo: true } }),
  ]);
  return [
    { value: "kas", label: "Saldo Kas", saldo: r.saldoKas },
    { value: "donasi", label: "Donasi terbuka (dikumpulkan terpisah)", saldo: 0 },
    { value: "infaq", label: "Saldo Infaq & Shodaqoh", saldo: r.saldoInfaq },
    ...tipeList.map((t) => ({
      value: `tabungan:${t.id}`,
      label: `Tabungan ${t.nama}`,
      saldo: t.saldo.reduce((a, s) => a + Number(s.jumlah), 0),
    })),
  ];
}
