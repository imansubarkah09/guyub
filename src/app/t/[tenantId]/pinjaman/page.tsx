import Link from "next/link";
import { Banknote, HandCoins, History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_CATAT_UANG, has } from "@/lib/authz";
import { effectiveRoles, viewerUserId } from "@/lib/effective-roles";
import { ambilDari } from "@/lib/paging";
import { Card, PageTitle, EmptyState, Badge, btnPrimary, btnGhost, inputClass, rupiah, tanggal } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import type { Prisma } from "@prisma/client";
import { ajukanPinjamanAction, putuskanPinjamanAction, batalkanPinjamanAction } from "./actions";
import { CatatCicilanForm, BatalkanCicilanButton } from "./cicilan-controls";

const STATUS_TONE = {
  diajukan: "warning",
  disetujui: "primary",
  ditolak: "danger",
  lunas: "success",
} as const;

const STATUS_LABEL = {
  diajukan: "Menunggu",
  disetujui: "Berjalan",
  ditolak: "Ditolak",
  lunas: "Lunas",
} as const;

/** Pinjaman lunas tetap tampil sekian hari ke bendahara, supaya cicilan pelunasan yang salah input masih bisa dibatalkan. */
const HARI_LUNAS_TAMPIL = 30;

function batasLunasTampil() {
  return new Date(Date.now() - HARI_LUNAS_TAMPIL * 24 * 60 * 60 * 1000);
}

const selectPinjamanBendahara = {
  id: true,
  jumlahPokok: true,
  bungaMode: true,
  bungaPersen: true,
  peminjam: { select: { name: true } },
  cicilan: {
    select: { id: true, tanggal: true, jumlahPokok: true, jumlahBunga: true, kasTransaksiId: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
} satisfies Prisma.PinjamanSelect;

export default async function PinjamanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ ambil?: string }>;
}) {
  const { tenantId } = await params;
  const { ambil: ambilParam } = await searchParams;
  const ambil = ambilDari(ambilParam, 50, 500);
  const user = await requireUser();
  const { roles } = await effectiveRoles(user, tenantId);
  const viewerId = await viewerUserId(user, tenantId);
  const canCatat = has(roles, CAN_CATAT_UANG);

  const [menunggu, aktif, baruLunas, milikSaya] = await Promise.all([
    canCatat
      ? prisma.pinjaman.findMany({
          where: { tenantId, status: "diajukan" },
          select: { id: true, jumlahPokok: true, bungaMode: true, bungaPersen: true, keterangan: true, diajukanPada: true, peminjam: { select: { name: true } } },
          orderBy: { diajukanPada: "asc" },
        })
      : Promise.resolve([]),
    canCatat
      ? prisma.pinjaman.findMany({
          where: { tenantId, status: "disetujui" },
          select: selectPinjamanBendahara,
          orderBy: { diajukanPada: "asc" },
        })
      : Promise.resolve([]),
    canCatat
      ? prisma.pinjaman.findMany({
          where: { tenantId, status: "lunas", cicilan: { some: { createdAt: { gte: batasLunasTampil() } } } },
          select: selectPinjamanBendahara,
          orderBy: { diajukanPada: "desc" },
        })
      : Promise.resolve([]),
    prisma.pinjaman.findMany({
      where: { tenantId, peminjamId: viewerId },
      select: {
        id: true,
        jumlahPokok: true,
        bungaMode: true,
        bungaPersen: true,
        keterangan: true,
        status: true,
        diajukanPada: true,
        cicilan: { select: { id: true, tanggal: true, jumlahPokok: true, jumlahBunga: true }, orderBy: { tanggal: "desc" } },
      },
      orderBy: { diajukanPada: "desc" },
      take: ambil,
    }),
  ]);

  const totalOutstanding = aktif.reduce((sum, p) => {
    const sudahDibayar = p.cicilan.reduce((a, c) => a + Number(c.jumlahPokok), 0);
    return sum + (Number(p.jumlahPokok) - sudahDibayar);
  }, 0);

  return (
    <div className="space-y-5">
      <PageTitle title="Simpan Pinjam" desc="Anggota mengajukan pinjaman, bendahara mencairkan dari saldo Kas" />

      {canCatat && (
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Banknote className="h-4 w-4 text-primary" /> Total Pinjaman Berjalan
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{rupiah.format(totalOutstanding)}</p>
          <p className="mt-1 text-xs text-muted">Sisa pokok dari semua pinjaman aktif — sudah keluar dari saldo Kas</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Ajukan Pinjaman</h2>
        <form action={ajukanPinjamanAction} className="space-y-2">
          <input type="hidden" name="tenantId" value={tenantId} />
          <InputRupiah name="jumlahPokok" placeholder="Jumlah pinjaman (Rp)" className={inputClass} required />
          <select name="bungaMode" required defaultValue="tanpa" className={inputClass}>
            <option value="tanpa">Tanpa bunga</option>
            <option value="persen">Bunga persen (dihitung dari sisa pokok tiap cicilan)</option>
            <option value="sukarela">Bunga sukarela (nominal bebas tiap cicilan)</option>
          </select>
          <input type="number" name="bungaPersen" min="0" step="0.1" placeholder="Persen bunga per cicilan (kalau mode persen)" className={inputClass} />
          <input name="keterangan" placeholder="Keperluan (opsional)" className={inputClass} />
          <button type="submit" className={`${btnPrimary} w-full`}>
            Ajukan
          </button>
        </form>
      </Card>

      {canCatat && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Menunggu Persetujuan</h2>
          {menunggu.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada pengajuan menunggu.</p>
          ) : (
            <ul className="space-y-2">
              {menunggu.map((p) => (
                <li key={p.id}>
                  <Card className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{p.peminjam.name}</p>
                        <p className="text-xs text-muted">
                          {rupiah.format(Number(p.jumlahPokok))} · {bungaLabel(p.bungaMode, p.bungaPersen)}
                        </p>
                        {p.keterangan && <p className="mt-0.5 text-xs text-muted">{p.keterangan}</p>}
                      </div>
                      <span className="flex-shrink-0 text-xs text-muted">{tanggal.format(p.diajukanPada)}</span>
                    </div>
                    <form action={putuskanPinjamanAction} className="flex gap-2">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="pinjamanId" value={p.id} />
                      <button name="decision" value="disetujui" className={btnPrimary}>
                        Setujui & Cairkan
                      </button>
                      <button name="decision" value="ditolak" className={btnGhost}>
                        Tolak
                      </button>
                    </form>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canCatat && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Pinjaman Aktif</h2>
          {aktif.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada pinjaman berjalan.</p>
          ) : (
            <ul className="space-y-2">
              {aktif.map((p) => {
                const sudahDibayar = p.cicilan.reduce((a, c) => a + Number(c.jumlahPokok), 0);
                const sisaPokok = Number(p.jumlahPokok) - sudahDibayar;
                const saranBunga = p.bungaMode === "persen" ? Math.round((sisaPokok * Number(p.bungaPersen ?? 0)) / 100) : 0;
                return (
                  <li key={p.id}>
                    <Card className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{p.peminjam.name}</p>
                          <p className="text-xs text-muted">
                            Sisa {rupiah.format(sisaPokok)} dari {rupiah.format(Number(p.jumlahPokok))} · {bungaLabel(p.bungaMode, p.bungaPersen)}
                          </p>
                        </div>
                      </div>
                      <CatatCicilanForm
                        tenantId={tenantId}
                        pinjamanId={p.id}
                        peminjam={p.peminjam.name}
                        sisaPokok={sisaPokok}
                        denganBunga={p.bungaMode !== "tanpa"}
                        saranBunga={p.bungaMode === "persen" ? saranBunga : null}
                        petunjukBunga={p.bungaMode === "persen" ? `Bunga (saran ${Number(p.bungaPersen)}% dari sisa)` : "Bunga (kalau ada)"}
                      />
                      <DaftarCicilan tenantId={tenantId} cicilan={p.cicilan} />
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {canCatat && baruLunas.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Baru Lunas</h2>
          <p className="mb-2 text-xs text-muted">Lunas dalam {HARI_LUNAS_TAMPIL} hari terakhir. Kalau cicilan pelunasannya salah input, batalkan di sini.</p>
          <ul className="space-y-2">
            {baruLunas.map((p) => (
              <li key={p.id}>
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.peminjam.name}</p>
                      <p className="text-xs text-muted">
                        {rupiah.format(Number(p.jumlahPokok))} · {bungaLabel(p.bungaMode, p.bungaPersen)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE.lunas}>{STATUS_LABEL.lunas}</Badge>
                  </div>
                  <DaftarCicilan tenantId={tenantId} cicilan={p.cicilan} />
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <History className="h-4 w-4" /> Riwayat Pinjaman Saya
        </h2>
        {milikSaya.length === 0 ? (
          <EmptyState icon={HandCoins} title="Belum pernah mengajukan" desc="Ajukan pinjaman lewat form di atas kalau perlu." />
        ) : (
          <ul className="space-y-2">
            {milikSaya.map((p) => {
              const sudahDibayar = p.cicilan.reduce((a, c) => a + Number(c.jumlahPokok), 0);
              return (
                <li key={p.id}>
                  <Card className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{rupiah.format(Number(p.jumlahPokok))}</p>
                        <p className="text-xs text-muted">
                          {bungaLabel(p.bungaMode, p.bungaPersen)} · Diajukan {tanggal.format(p.diajukanPada)}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </div>
                    {p.status === "diajukan" && (
                      <form action={batalkanPinjamanAction}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="pinjamanId" value={p.id} />
                        <button type="submit" className="text-xs text-danger underline">
                          Batalkan pengajuan
                        </button>
                      </form>
                    )}
                    {p.status === "disetujui" && (
                      <p className="text-xs text-muted">Sisa {rupiah.format(Number(p.jumlahPokok) - sudahDibayar)}</p>
                    )}
                    {p.cicilan.length > 0 && (
                      <ul className="space-y-1 border-t border-border pt-2 text-xs text-muted">
                        {p.cicilan.map((c) => (
                          <li key={c.id}>
                            {tanggal.format(c.tanggal)} · pokok {rupiah.format(Number(c.jumlahPokok))}
                            {Number(c.jumlahBunga) > 0 && <> + bunga {rupiah.format(Number(c.jumlahBunga))}</>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {milikSaya.length === ambil && (
          <p className="mt-2 text-center">
            <Link href={`?ambil=${ambil + 50}`} className="text-xs text-primary underline">
              Muat 50 lagi
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

/** Riwayat cicilan untuk bendahara, terbaru di atas. Hanya yang teratas yang bisa dibatalkan (lihat batalkanCicilanAction). */
function DaftarCicilan({
  tenantId,
  cicilan,
}: {
  tenantId: string;
  cicilan: { id: string; tanggal: Date; jumlahPokok: unknown; jumlahBunga: unknown; kasTransaksiId: string | null }[];
}) {
  if (cicilan.length === 0) return null;
  return (
    <ul className="space-y-1 border-t border-border pt-2 text-xs text-muted">
      {cicilan.map((c, i) => (
        <li key={c.id}>
          {tanggal.format(c.tanggal)} · pokok {rupiah.format(Number(c.jumlahPokok))}
          {Number(c.jumlahBunga) > 0 && <> + bunga {rupiah.format(Number(c.jumlahBunga))}</>}
          {i === 0 && c.kasTransaksiId && (
            <>
              {" · "}
              <BatalkanCicilanButton tenantId={tenantId} cicilanId={c.id} nominal={Number(c.jumlahPokok) + Number(c.jumlahBunga)} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function bungaLabel(mode: "tanpa" | "persen" | "sukarela", persen: unknown) {
  if (mode === "tanpa") return "Tanpa bunga";
  if (mode === "persen") return `Bunga ${Number(persen)}%/cicilan`;
  return "Bunga sukarela";
}
