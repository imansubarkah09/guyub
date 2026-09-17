import Link from "next/link";
import { Wheat, Coins, ArrowRightLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import { angkaPlerek, kilogram } from "@/lib/plerek";
import { ambilDari } from "@/lib/paging";
import { hariIniWIB } from "@/lib/waktu";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, inputClass, rupiah, tanggal } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { catatPutaranAction, catatBerasKeluarAction, setorKeKasAction } from "./actions";

const hariIni = hariIniWIB;

export default async function PlerekPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ ambil?: string }>;
}) {
  const { tenantId } = await params;
  const { ambil: ambilParam } = await searchParams;
  const ambil = ambilDari(ambilParam, 200, 2000);
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);

  // Saldo di kartu atas tetap dihitung penuh di SQL lewat angkaPlerek(),
  // jadi `ambil` di bawah cuma membatasi daftar riwayatnya, bukan angkanya.
  const [angka, putaran, berasKeluar, setoran] = await Promise.all([
    angkaPlerek(tenantId),
    prisma.plerekPutaran.findMany({
      where: { tenantId },
      select: { id: true, tanggal: true, petugas: true, jumlahUang: true, berasKg: true, keterangan: true, dicatatOleh: { select: { name: true } } },
      orderBy: { tanggal: "desc" },
      take: ambil,
    }),
    prisma.plerekBerasKeluar.findMany({
      where: { tenantId },
      select: { id: true, tanggal: true, berasKg: true, hasilPenjualan: true, keterangan: true, dicatatOleh: { select: { name: true } } },
      orderBy: { tanggal: "desc" },
      take: ambil,
    }),
    prisma.plerekSetoranKas.findMany({
      where: { tenantId },
      select: { id: true, tanggal: true, jumlah: true, dicatatOleh: { select: { name: true } } },
      orderBy: { tanggal: "desc" },
      take: ambil,
    }),
  ]);

  const canCatat = has(roles, CAN_CATAT_UANG);

  // Tiga jenis kejadian digabung jadi satu lini masa supaya urutan kejadiannya
  // terbaca apa adanya, bukan dipisah tiga daftar yang harus dibandingkan sendiri.
  type Baris = { id: string; tanggal: Date; judul: string; sub: string; nilai: string; tone: "primary" | "warning" | "muted" };
  const riwayat: Baris[] = [
    ...putaran.map((p) => ({
      id: `p-${p.id}`,
      tanggal: p.tanggal,
      judul: "Keliling",
      sub: [p.petugas ? `petugas ${p.petugas}` : null, p.keterangan, `dicatat ${p.dicatatOleh.name}`].filter(Boolean).join(" · "),
      nilai: [Number(p.jumlahUang) > 0 ? rupiah.format(Number(p.jumlahUang)) : null, Number(p.berasKg) > 0 ? `${kilogram.format(Number(p.berasKg))} kg` : null]
        .filter(Boolean)
        .join(" + "),
      tone: "primary" as const,
    })),
    ...berasKeluar.map((b) => ({
      id: `b-${b.id}`,
      tanggal: b.tanggal,
      judul: b.hasilPenjualan ? "Beras dijual" : "Beras keluar",
      sub: [b.keterangan, `dicatat ${b.dicatatOleh.name}`].filter(Boolean).join(" · "),
      nilai: b.hasilPenjualan
        ? `−${kilogram.format(Number(b.berasKg))} kg → ${rupiah.format(Number(b.hasilPenjualan))}`
        : `−${kilogram.format(Number(b.berasKg))} kg`,
      tone: "warning" as const,
    })),
    ...setoran.map((s) => ({
      id: `s-${s.id}`,
      tanggal: s.tanggal,
      judul: "Disetor ke Kas",
      sub: `dicatat ${s.dicatatOleh.name}`,
      nilai: `−${rupiah.format(Number(s.jumlah))}`,
      tone: "muted" as const,
    })),
  ].sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());

  return (
    <div className="space-y-5">
      <PageTitle title="Plerek" desc="Uang & beras yang dikumpulkan petugas keliling dari tiap rumah" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Coins className="h-4 w-4 text-primary" /> Saldo Uang Plerek
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{rupiah.format(angka.saldoUang)}</p>
          <p className="mt-1 text-xs text-muted">
            Keliling {rupiah.format(angka.uangKeliling)} · jual beras {rupiah.format(angka.hasilJualBeras)} · ke Kas{" "}
            {rupiah.format(angka.disetorKeKas)} · kegiatan {rupiah.format(angka.dipakaiKegiatan)}
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-transparent">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Wheat className="h-4 w-4 text-accent" /> Stok Beras
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{kilogram.format(angka.stokBerasKg)} kg</p>
          <p className="mt-1 text-xs text-muted">
            Terkumpul {kilogram.format(angka.berasMasukKg)} kg · keluar {kilogram.format(angka.berasKeluarKg)} kg
          </p>
        </Card>
      </div>

      {canCatat && (
        <>
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Catat Hasil Keliling</h2>
            <p className="mb-3 text-xs text-muted">Isi totalnya satu putaran, bukan per rumah. Boleh uang saja, beras saja, atau dua-duanya.</p>
            {/* Tidak perlu key untuk mengosongkan isian: React 19 mereset form
                sendiri sesudah server action selesai (sudah diukur di form Kas yang
                tidak pernah disentuh). Resetnya menyusul SESUDAH aksi selesai,
                bukan saat tombol ditekan — itu yang dulu terlihat seperti bug. */}
            <form action={catatPutaranAction} className="space-y-2">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="date" name="tanggal" required defaultValue={hariIni()} className={inputClass} />
              <InputRupiah name="jumlahUang" placeholder="Total uang (Rp)" className={inputClass} />
              <input type="number" name="berasKg" min="0" step="0.01" placeholder="Total beras (kg)" className={inputClass} />
              <input name="petugas" placeholder="Nama petugas keliling (opsional)" className={inputClass} />
              <input name="keterangan" placeholder="Keterangan (opsional)" className={inputClass} />
              <button type="submit" className={`${btnPrimary} w-full`}>
                Catat Putaran
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Beras Keluar</h2>
            <form action={catatBerasKeluarAction} className="space-y-2">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="date" name="tanggal" required defaultValue={hariIni()} className={inputClass} />
              <input type="number" name="berasKg" min="0.01" step="0.01" required placeholder="Beras keluar (kg)" className={inputClass} />
              {/* Select, bukan checkbox yang menyembunyikan field: halaman ini Server
                  Component, jadi tidak boleh ada event handler di sini. */}
              <select name="dijual" defaultValue="tidak" className={inputClass}>
                <option value="tidak">Dibagikan / dipakai (tidak jadi uang)</option>
                <option value="ya">Dijual</option>
              </select>
              <InputRupiah name="hasilPenjualan" placeholder="Hasil penjualan (Rp) — isi kalau dijual" className={inputClass} />
              <input name="keterangan" placeholder="Keterangan (opsional)" className={inputClass} />
              <button type="submit" className={`${btnPrimary} w-full`}>
                Catat Beras Keluar
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Setor ke Kas</h2>
            <p className="mb-3 text-xs text-muted">
              Memindahkan uang plerek ke Kas tenant. Otomatis muncul sebagai pemasukan di halaman Kas. Untuk membiayai kegiatan
              langsung dari plerek, pakai menu Dana Kegiatan dan pilih sumber &quot;Plerek&quot;.
            </p>
            <form action={setorKeKasAction} className="space-y-2">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="date" name="tanggal" required defaultValue={hariIni()} className={inputClass} />
              <InputRupiah name="jumlah" placeholder="Jumlah disetor (Rp)" className={inputClass} required />
              <input name="keterangan" placeholder="Keterangan (opsional)" className={inputClass} />
              <button type="submit" className={`${btnPrimary} w-full`}>
                Setor ke Kas
              </button>
            </form>
          </Card>
        </>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Riwayat</h2>
        {riwayat.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="Belum ada catatan plerek"
            desc={canCatat ? "Catat hasil keliling pertama lewat form di atas." : "Bendahara belum mencatat hasil keliling plerek."}
          />
        ) : (
          <ul className="space-y-2">
            {riwayat.map((b) => (
              <li key={b.id}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {tanggal.format(b.tanggal)} <Badge tone={b.tone}>{b.judul}</Badge>
                    </p>
                    {b.sub && <p className="truncate text-xs text-muted">{b.sub}</p>}
                  </div>
                  <span className="flex-shrink-0 text-sm font-medium tabular-nums">{b.nilai}</span>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {(putaran.length === ambil || berasKeluar.length === ambil || setoran.length === ambil) && (
          <p className="mt-2 text-center">
            <Link href={`?ambil=${ambil + 200}`} className="text-xs text-primary underline">
              Muat 200 lagi
            </Link>
          </p>
        )}
      </section>

      {!canCatat && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ArrowRightLeft className="h-3.5 w-3.5" /> Hanya bendahara yang bisa mencatat plerek.
        </p>
      )}
    </div>
  );
}
