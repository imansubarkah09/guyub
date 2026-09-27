"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, btnGhost, btnPrimary } from "@/components/ui";
import { tandaiDibacaAction, tandaiSemuaDibacaAction } from "@/app/account-actions";

export type InboxItem = {
  id: string;
  pesan: string;
  href: string | null;
  isRead: boolean;
  tanggal: string;
  tanggalPendek: string;
  tenantNama: string | null;
};

const PER_HAL = 10;

/**
 * Inbox ala email (pola Novelis/Brokado, 27 Sep 2026). Item terpilih disimpan di
 * ?id= lewat history.pushState, jadi tombol back HP kembali ke daftar, bukan
 * keluar halaman. Sengaja TIDAK auto-memilih item pertama: di HP item itu tidak
 * terlihat, jadi menandainya dibaca berarti bohong ke pengguna.
 */
export function Inbox({ items }: { items: InboxItem[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const idDipilih = params.get("id");
  // "dari=daftar" = entri riwayat tepat di bawah entri ini adalah daftar, jadi
  // Kembali boleh history.back(). Penandanya sengaja di URL: history.state buatan
  // sendiri dibuang Next tiap navigasi/refresh (preserveCustomHistoryState false),
  // termasuk refresh sesudah "tandai dibaca", dan useRef basi setelah back HP.
  const diAtasDaftar = params.get("dari") === "daftar";
  const dipilih = items.find((i) => i.id === idDipilih) ?? null;
  const [dibaca, setDibaca] = useState<Set<string>>(() => new Set(idDipilih ? [idDipilih] : []));
  const [hanyaBelum, setHanyaBelum] = useState(false);
  const [hal, setHal] = useState(() => Math.max(0, Math.floor(items.findIndex((i) => i.id === idDipilih) / PER_HAL)));

  // Ditandai dibaca saat isinya tampil: dari klik di daftar maupun datang dari lonceng (?id=).
  const idBaruDibuka = dipilih && !dipilih.isRead ? dipilih.id : null;
  useEffect(() => {
    if (idBaruDibuka) tandaiDibacaAction(idBaruDibuka);
  }, [idBaruDibuka]);

  // Di HP, isi yang dibuka dari luar daftar (lonceng di halaman lain) disisipi entri
  // daftar di bawahnya, supaya back HP maupun tombol Kembali ke daftar dulu, bukan
  // ke halaman asal (laporan Iman 27 Sep 2026).
  useEffect(() => {
    if (!idDipilih || diAtasDaftar || window.matchMedia("(min-width: 1024px)").matches) return;
    window.history.replaceState(null, "", pathname);
    window.history.pushState(null, "", `${pathname}?id=${idDipilih}&dari=daftar`);
  }, [idDipilih, diAtasDaftar, pathname]);

  if (items.length === 0) {
    return <EmptyState icon={Bell} title="Belum ada notifikasi" desc="Kabar dari tenant Anda, seperti pengajuan pinjaman, jadwal arisan, atau persetujuan anggota, akan muncul di sini." />;
  }

  const sudahDibaca = (i: InboxItem) => i.isRead || dibaca.has(i.id);
  const jumlahBelum = items.filter((i) => !sudahDibaca(i)).length;
  const daftar = hanyaBelum ? items.filter((i) => !sudahDibaca(i) || i.id === idDipilih) : items;
  const jumlahHal = Math.max(1, Math.ceil(daftar.length / PER_HAL));
  const halAman = Math.min(hal, jumlahHal - 1);
  const halaman = daftar.slice(halAman * PER_HAL, (halAman + 1) * PER_HAL);

  function buka(id: string) {
    setDibaca((s) => new Set(s).add(id));
    // Di layar lebar daftar dan isi tampil berdampingan, jadi ganti item cukup
    // replace; di HP push supaya back kembali ke daftar.
    if (window.matchMedia("(min-width: 1024px)").matches) window.history.replaceState(null, "", `${pathname}?id=${id}`);
    else window.history.pushState(null, "", `${pathname}?id=${id}&dari=daftar`);
  }

  function kembali() {
    if (diAtasDaftar) window.history.back();
    else window.history.replaceState(null, "", pathname);
  }

  function tandaiSemua() {
    setDibaca(new Set(items.map((i) => i.id)));
    tandaiSemuaDibacaAction();
  }

  const chip = (aktif: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition ${aktif ? "bg-primary text-primary-foreground" : "border border-border text-muted hover:bg-primary/5"}`;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-4">
      <section className={`${dipilih ? "hidden lg:block" : ""} overflow-hidden rounded-[var(--radius)] border border-border bg-surface`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="flex gap-1">
            <button onClick={() => (setHanyaBelum(false), setHal(0))} className={chip(!hanyaBelum)}>
              Semua
            </button>
            <button onClick={() => (setHanyaBelum(true), setHal(0))} className={chip(hanyaBelum)}>
              Belum dibaca ({jumlahBelum})
            </button>
          </div>
          {jumlahBelum > 0 && (
            <button onClick={tandaiSemua} className="text-xs font-medium text-primary hover:underline">
              Tandai semua dibaca
            </button>
          )}
        </div>

        {halaman.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Semua notifikasi sudah dibaca.</p>
        ) : (
          <ul>
            {halaman.map((i) => {
              const baru = !sudahDibaca(i);
              const aktif = i.id === dipilih?.id;
              return (
                <li key={i.id}>
                  <button
                    onClick={() => buka(i.id)}
                    aria-current={aktif ? "true" : undefined}
                    className={`flex w-full gap-2 border-b border-border px-3 py-3 text-left text-sm transition hover:bg-primary/5 ${
                      aktif ? "bg-primary/10" : baru ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${baru ? "bg-primary" : "bg-transparent"}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`line-clamp-2 [overflow-wrap:anywhere] ${baru ? "font-semibold" : ""}`}>{i.pesan}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{[i.tenantNama, i.tanggalPendek].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {jumlahHal > 1 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <button disabled={halAman === 0} onClick={() => setHal(halAman - 1)} className={`${btnGhost} px-2 py-1 text-xs`} aria-label="Halaman sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted">
              Halaman {halAman + 1} dari {jumlahHal}
            </span>
            <button disabled={halAman >= jumlahHal - 1} onClick={() => setHal(halAman + 1)} className={`${btnGhost} px-2 py-1 text-xs`} aria-label="Halaman berikutnya">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <section
        className={`${dipilih ? "" : "hidden lg:flex lg:min-h-64 lg:items-center lg:justify-center"} rounded-[var(--radius)] border border-border bg-surface p-4 lg:sticky lg:top-18 lg:p-5`}
      >
        {dipilih ? (
          <article className="space-y-4">
            <button onClick={kembali} className="-ml-1 flex items-center gap-1 text-sm font-medium text-primary lg:hidden">
              <ChevronLeft className="h-4 w-4" />
              Kembali ke daftar
            </button>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted">{dipilih.tenantNama ?? "Guyub"}</p>
              <p className="whitespace-pre-wrap text-base font-medium leading-relaxed [overflow-wrap:anywhere]">{dipilih.pesan}</p>
              <p className="text-xs text-muted">{dipilih.tanggal}</p>
            </div>
            {dipilih.href && (
              <Link href={dipilih.href} className={btnPrimary}>
                Buka dan tindak lanjuti
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </article>
        ) : (
          <p className="text-sm text-muted">Pilih notifikasi untuk membaca isinya.</p>
        )}
      </section>
    </div>
  );
}
