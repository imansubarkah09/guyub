import Link from "next/link";
import { notFound } from "next/navigation";
import { Wallet, HandCoins, CircleDollarSign, HeartHandshake, PiggyBank, CalendarDays, CheckCircle2, ListTodo } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ringkasanTenant, pesanGamifiedQurban } from "@/lib/ringkasan";
import { tenantDenganProfil } from "@/lib/tenant";
import { Card, StatCard, PageTitle, Badge, Progress, EmptyState, rupiah, tanggal } from "@/components/ui";
import { HewanIcon } from "@/components/hewan";
import { NyawaBar, DonaturList } from "@/components/nyawa";
import { TrakteerModal } from "@/components/trakteer-modal";
import { TRAKTEER_MODAL_URL, sisaHari } from "@/lib/trakteer";

/** Kolom yang benar-benar dipakai kartu donatur — sisanya (orderId, pesan) tidak perlu ikut terbawa. */
const KOLOM_DONATUR = { id: true, namaDonatur: true, jumlah: true, hariNyawa: true, createdAt: true } as const;

export default async function RingkasanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const r = await ringkasanTenant(tenantId);
  const base = `/t/${tenantId}`;

  const [nodeSaya, anggotaAktif, tenant, donaturTerbaru, donaturTerbesar] = await Promise.all([
    prisma.familyNode.findFirst({ where: { tenantId, userId: user.id }, select: { id: true } }),
    prisma.membership.count({ where: { tenantId, status: "active" } }),
    tenantDenganProfil(tenantId),
    prisma.trakteerDonasi.findMany({ where: { tenantId }, select: KOLOM_DONATUR, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.trakteerDonasi.findMany({ where: { tenantId }, select: KOLOM_DONATUR, orderBy: { jumlah: "desc" }, take: 50 }),
  ]);

  // Layout tenant sudah menolak tenant yang tidak ada; ini cuma supaya tipenya menyempit.
  if (!tenant) notFound();

  const keDonatur = (d: (typeof donaturTerbaru)[number]) => ({
    id: d.id,
    nama: d.namaDonatur,
    jumlah: Number(d.jumlah),
    hari: d.hariNyawa,
    tanggal: tanggal.format(d.createdAt),
  });

  // Saldo tabungan pribadi + berapa anggota yang sudah menabung (§7.3).
  const saldoSaya = r.tabunganTipe
    .map((t) => ({
      nama: t.nama,
      mode: t.mode,
      milikSaya: t.saldo.filter((s) => s.userId === user.id).reduce((a, s) => a + Number(s.jumlah), 0),
      total: t.saldo.reduce((a, s) => a + Number(s.jumlah), 0),
      penabung: new Set(t.saldo.filter((s) => s.userId && Number(s.jumlah) > 0).map((s) => s.userId)).size,
    }))
    .filter((t) => t.mode === "pooled" || t.total > 0 || t.milikSaya > 0);

  const ikutQurban = r.qurban.length > 0;
  const sayaIkutQurban = await prisma.qurbanSlot.count({ where: { userId: user.id, qurbanGroup: { tenantId } } });
  const arisanSaya = r.arisan.find((a) => a.pesertaUserIds.includes(user.id));

  // Checklist personal — dihitung dari kondisi data asli, bukan flag manual (§7.3).
  const checklist: { pesan: string; href: string }[] = [];
  if (!user.phone) checklist.push({ pesan: "Lengkapi nomor WhatsApp Anda di menu profil (klik avatar kanan atas)", href: base });
  if (!nodeSaya) checklist.push({ pesan: "Anda belum memiliki silsilah keluarga, buat silsilah keluarga Anda sendiri", href: `${base}/silsilah` });
  if (ikutQurban && sayaIkutQurban === 0)
    checklist.push({ pesan: "Anda belum join tabungan qurban, segera berpartisipasi untuk mendapat ridho dari Allah", href: `${base}/qurban` });
  if (arisanSaya && !arisanSaya.sudahBayarUserIds.includes(user.id))
    checklist.push({ pesan: `Anda belum bayar arisan ${arisanSaya.periode} putaran ${arisanSaya.putaran}`, href: `${base}/arisan` });

  const arisanAktif = r.arisan[0];

  return (
    <div className="space-y-5">
      <PageTitle title="Dashboard" desc={`${anggotaAktif} anggota aktif`} />

      {/* Ringkasan keuangan TENANT memimpin halaman — elemen yang paling sering
          dicari saat "cek status tenant" (ketemu review 15 Sep 2026). 4 kolom
          di layar lebar (sm:) supaya tidak jadi 2 baris sempit begitu ada ruang. */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <h2 className="sr-only col-span-2 sm:col-span-4">Ringkasan Keuangan</h2>
        <StatCard label="Saldo Kas" value={rupiah.format(r.saldoKas)} icon={Wallet} tone={r.saldoKas < 0 ? "danger" : "primary"} />
        <StatCard label="Infaq & Shodaqoh" value={rupiah.format(r.saldoInfaq)} icon={HeartHandshake} tone={r.saldoInfaq < 0 ? "danger" : "accent"} />
        <StatCard
          label="Tabungan Qurban"
          value={rupiah.format(r.qurbanTotal)}
          icon={HandCoins}
          sub={
            <>
              {r.qurban.filter((q) => q.jenisHewan === "kambing").length} kambing ·{" "}
              {r.qurban.filter((q) => q.jenisHewan === "sapi").length} sapi ({r.qurban.filter((q) => q.selesai).length} lunas)
            </>
          }
        />
        <StatCard
          label="Arisan Berjalan"
          value={rupiah.format(arisanAktif?.saldoBerjalan ?? 0)}
          icon={CircleDollarSign}
          tone="success"
          sub={arisanAktif ? `Giliran: ${arisanAktif.penerimaBerikutnya ?? "selesai semua"}` : "Belum ada arisan"}
        />
      </section>

      {/* "Tugas Anda" dipindah naik ke urutan ke-2 (setelah uang) — ini daftar
          personal yang butuh aksi, jauh lebih relevan buat visitor yang balik
          lagi daripada widget dukungan platform yang sebelumnya berdiri di
          antara uang dan checklist (§layout, 15 Sep 2026). */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ListTodo className="h-4 w-4 text-primary" />
          Tugas Anda
        </h2>
        {checklist.length === 0 ? (
          <Card className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm text-muted">Semua beres — tidak ada yang perlu Anda lengkapi.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.pesan}>
                <Link href={c.href} className="flex items-start gap-2 rounded-[var(--radius)] border border-warning/30 bg-warning/5 p-3 text-sm transition hover:bg-warning/10">
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-warning" />
                  {c.pesan}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {arisanAktif?.jadwalTanggal && (
        <Card className="border-accent/30 bg-accent/5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-accent" />
            Arisan berikutnya: {tanggal.format(arisanAktif.jadwalTanggal)}
            {arisanAktif.jadwalTempat ? ` di ${arisanAktif.jadwalTempat}` : ""}
          </p>
        </Card>
      )}

      {r.qurban.filter((q) => !q.selesai).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Progress Qurban</h2>
          <div className="space-y-2">
            {r.qurban
              .filter((q) => !q.selesai)
              .map((q) => (
                <Card key={q.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <HewanIcon jenis={q.jenisHewan} className="h-4 w-4 text-primary" /> Qurban {q.jenisHewan}
                    </span>
                    <Badge tone="primary">
                      {q.terisi}/{q.max} jiwa
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{pesanGamifiedQurban(q)}</p>
                  <div className="mt-2">
                    <Progress value={(q.lunasNama.length / q.max) * 100} />
                  </div>
                </Card>
              ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Tabungan Anda</h2>
        {saldoSaya.length === 0 ? (
          <EmptyState icon={PiggyBank} title="Belum ada tabungan" desc="Belum ada jenis tabungan yang dibuat bendahara di tenant ini." />
        ) : (
          <div className="space-y-2">
            {saldoSaya.map((t) => (
              <Card key={t.nama}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{t.nama}</span>
                  <span className="tabular-nums">{rupiah.format(t.mode === "pooled" ? t.total : t.milikSaya)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t.mode === "pooled" ? "Tabungan bersama" : `${t.penabung} dari ${anggotaAktif} anggota sudah menabung · total ${rupiah.format(t.total)}`}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Klaster "dukungan platform" — NyawaBar & donatur sudah self-label
          (uppercase kecil) jadi tidak perlu heading pembungkus lagi, cukup
          dikelompokkan rapat (space-y-2) supaya kebaca sebagai SATU topik,
          bukan 3 blok terpisah dengan bobot sama seperti bagian tenant di
          atas. Diletakkan paling bawah: paling kecil relevansinya untuk
          "cek status tenant saya", yang justru jadi alasan orang buka
          dashboard ini (§layout, 15 Sep 2026). */}
      <section className="space-y-2">
        <NyawaBar sisaHari={sisaHari(tenant.nyawaSampai)} sampai={tenant.nyawaSampai ? tanggal.format(tenant.nyawaSampai) : null} />
        <div className="grid gap-2 min-[520px]:grid-cols-2">
          <DonaturList judul="Pendukung Aplikasi Terbaru" items={donaturTerbaru.map(keDonatur)} urut="terbaru" />
          <DonaturList judul="Dukungan Terbesar untuk Guyub" items={donaturTerbesar.map(keDonatur)} urut="terbesar" />
        </div>
        {TRAKTEER_MODAL_URL && (
          <TrakteerModal modalUrl={TRAKTEER_MODAL_URL} kodeDonasi={tenant.kodeDonasi} namaTenant={tenant.profile?.nama ?? "tenant ini"} />
        )}
      </section>
    </div>
  );
}
