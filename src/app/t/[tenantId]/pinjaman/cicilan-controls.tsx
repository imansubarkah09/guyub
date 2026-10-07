"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Card, btnPrimary, btnGhost, inputClass, rupiah } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { catatCicilanAction, batalkanCicilanAction } from "./actions";

function useTutupDenganEscape(buka: boolean, tutup: () => void) {
  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buka, tutup]);
}

/**
 * Form cicilan dengan langkah konfirmasi. Dulu isian pokok sudah terisi sisa pokok
 * penuh dan langsung terkirim begitu tombol ditekan, sehingga bendahara yang mau
 * mencatat angsuran 100rb tanpa sadar melunasi pinjaman 300rb (kejadian 3 Okt 2026).
 * Sekarang pokok selalu kosong, dan sebelum tersimpan bendahara melihat ringkasan
 * nominal serta peringatan kalau pembayaran ini melunasi pinjaman.
 */
export function CatatCicilanForm({
  tenantId,
  pinjamanId,
  peminjam,
  sisaPokok,
  denganBunga,
  saranBunga,
  petunjukBunga,
}: {
  tenantId: string;
  pinjamanId: string;
  peminjam: string;
  sisaPokok: number;
  denganBunga: boolean;
  saranBunga: number | null;
  petunjukBunga: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [konfirmasi, setKonfirmasi] = useState<{ pokok: number; bunga: number; data: FormData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tutup = () => {
    if (!pending) setKonfirmasi(null);
  };
  useTutupDenganEscape(!!konfirmasi, tutup);

  function periksa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const pokok = Number(data.get("jumlahPokok"));
    const bunga = Number(data.get("jumlahBunga") || 0);
    if (!pokok || pokok <= 0) return setError("Isi pokok yang dibayar");
    if (pokok > sisaPokok) return setError(`Pokok dibayar melebihi sisa pinjaman (sisa ${rupiah.format(sisaPokok)})`);
    setKonfirmasi({ pokok, bunga, data });
  }

  function simpan() {
    if (!konfirmasi) return;
    startTransition(async () => {
      const hasil = await catatCicilanAction(konfirmasi.data);
      setKonfirmasi(null);
      if (hasil?.error) {
        setError(hasil.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  const sisaSesudah = konfirmasi ? sisaPokok - konfirmasi.pokok : 0;

  return (
    <>
      <form ref={formRef} onSubmit={periksa} className="space-y-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="pinjamanId" value={pinjamanId} />
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Pokok dibayar</span>
            <InputRupiah name="jumlahPokok" placeholder="mis. 100.000" className={`${inputClass} w-36`} required />
          </label>
          {denganBunga && (
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{petunjukBunga}</span>
              {/* key: saran bunga persen ikut sisa pokok, jadi remount supaya nilai awalnya ikut berubah sesudah cicilan tercatat. */}
              <InputRupiah key={saranBunga ?? "kosong"} name="jumlahBunga" placeholder="0" className={`${inputClass} w-32`} defaultValue={saranBunga} />
            </label>
          )}
          <button type="submit" className={btnPrimary}>
            Catat Cicilan
          </button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </form>

      {konfirmasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-sm shadow-xl">
            <p className="font-semibold">Catat cicilan {peminjam}?</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Pokok</dt>
                <dd className="tabular-nums">{rupiah.format(konfirmasi.pokok)}</dd>
              </div>
              {denganBunga && (
                <div className="flex justify-between">
                  <dt className="text-muted">Bunga</dt>
                  <dd className="tabular-nums">{rupiah.format(konfirmasi.bunga)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1 font-medium">
                <dt>Masuk ke Kas</dt>
                <dd className="tabular-nums">{rupiah.format(konfirmasi.pokok + konfirmasi.bunga)}</dd>
              </div>
            </dl>
            {sisaSesudah === 0 ? (
              <p className="mt-3 rounded-lg bg-warning/10 p-2 text-sm font-medium text-warning">Pembayaran ini MELUNASI pinjaman.</p>
            ) : (
              <p className="mt-3 text-sm text-muted">Sisa pokok sesudahnya {rupiah.format(sisaSesudah)}.</p>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={simpan} disabled={pending} className={`${btnPrimary} flex-1`}>
                {pending ? "Menyimpan..." : "Ya, catat"}
              </button>
              <button type="button" onClick={tutup} disabled={pending} className={btnGhost}>
                Periksa lagi
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/** Batalkan cicilan terakhir yang salah input, beserta baris Kas-nya. Lihat batalkanCicilanAction. */
export function BatalkanCicilanButton({ tenantId, cicilanId, nominal }: { tenantId: string; cicilanId: string; nominal: number }) {
  const [buka, setBuka] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tutup = () => {
    if (pending) return;
    setBuka(false);
    setError(null);
  };
  useTutupDenganEscape(buka, tutup);

  function batalkan() {
    const data = new FormData();
    data.set("tenantId", tenantId);
    data.set("cicilanId", cicilanId);
    startTransition(async () => {
      const hasil = await batalkanCicilanAction(data);
      if (hasil?.error) {
        setError(hasil.error);
        return;
      }
      setBuka(false);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className="text-danger underline">
        batalkan
      </button>

      {buka && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-sm shadow-xl">
            <p className="font-semibold">Batalkan cicilan ini?</p>
            <p className="mt-1 text-sm text-muted">
              Cicilan dan baris Kas masuk {rupiah.format(nominal)} akan dihapus. Kalau pinjaman sudah lunas, statusnya kembali berjalan.
            </p>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={batalkan}
                disabled={pending}
                className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? "Membatalkan..." : "Ya, batalkan"}
              </button>
              <button type="button" onClick={tutup} disabled={pending} className={btnGhost}>
                Tutup
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
