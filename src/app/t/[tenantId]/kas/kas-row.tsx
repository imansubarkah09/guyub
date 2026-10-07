"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
import { Card, btnPrimary, btnGhost, inputClass, rupiah, tanggal } from "@/components/ui";
import { InputRupiah } from "@/components/input-rupiah";
import { validasiFileGambar } from "@/lib/validasi-file";
import { tanggalWIB } from "@/lib/waktu";
import { updateKasTransaksiAction } from "./actions";

type Transaksi = {
  id: string;
  tanggal: Date;
  jumlah: number;
  tipe: "masuk" | "keluar";
  keterangan: string | null;
  keteranganRahasia: boolean;
  buktiUrl: string | null;
  dicatatOleh: { name: string };
  /** Baris dari Simpan Pinjam: nominal dan tipe dikunci supaya Kas tetap cocok dengan cicilan atau pencairannya. */
  sumberPinjaman: "cicilan" | "pencairan" | null;
};

function TombolSimpan({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={`${btnPrimary} disabled:opacity-50`}>
      {pending ? "..." : "Simpan"}
    </button>
  );
}

export function KasRow({ tenantId, t, canEdit }: { tenantId: string; t: Transaksi; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!editing) {
    return (
      <Card className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${t.tipe === "masuk" ? "bg-success/10" : "bg-danger/10"}`}>
            {t.tipe === "masuk" ? <ArrowDownLeft className="h-4 w-4 text-success" /> : <ArrowUpRight className="h-4 w-4 text-danger" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm">{t.keterangan ?? "(tanpa keterangan)"}</p>
            <p className="text-xs text-muted">
              {tanggal.format(t.tanggal)} · {t.dicatatOleh.name}
              {t.buktiUrl && (
                <>
                  {" · "}
                  <a href={t.buktiUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    bukti
                  </a>
                </>
              )}
              {canEdit && (
                <>
                  {" · "}
                  <button onClick={() => setEditing(true)} className="inline-flex items-center gap-0.5 text-primary underline">
                    <Pencil className="h-3 w-3" /> edit
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        <span className={`flex-shrink-0 text-sm font-medium tabular-nums ${t.tipe === "masuk" ? "text-success" : "text-danger"}`}>
          {t.tipe === "masuk" ? "+" : "−"}
          {rupiah.format(Number(t.jumlah))}
        </span>
      </Card>
    );
  }

  return (
    <Card>
      <form
        action={async (formData) => {
          setServerError(null);
          const result = await updateKasTransaksiAction(formData);
          if (result?.error) {
            setServerError(result.error);
            return;
          }
          setEditing(false);
        }}
        className="space-y-2"
      >
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="id" value={t.id} />
        {t.sumberPinjaman ? (
          <>
            <input type="date" name="tanggal" required defaultValue={tanggalWIB(t.tanggal)} className={inputClass} />
            <input type="hidden" name="tipe" value={t.tipe} />
            <input type="hidden" name="jumlah" value={String(t.jumlah)} />
            <p className="rounded-lg bg-primary/5 p-2 text-xs text-muted">
              {t.tipe === "masuk" ? "Masuk" : "Keluar"} {rupiah.format(t.jumlah)} dari {t.sumberPinjaman} Simpan Pinjam.{" "}
              {t.sumberPinjaman === "cicilan"
                ? "Nominalnya tidak bisa diubah di sini: kalau salah, batalkan cicilannya di halaman Simpan Pinjam lalu catat ulang."
                : "Nominalnya mengikuti jumlah pinjaman dan tidak bisa diubah di sini."}
            </p>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <input type="date" name="tanggal" required defaultValue={tanggalWIB(t.tanggal)} className={inputClass} />
              <select name="tipe" required defaultValue={t.tipe} className={inputClass}>
                <option value="masuk">Masuk</option>
                <option value="keluar">Keluar</option>
              </select>
            </div>
            <InputRupiah name="jumlah" placeholder="Jumlah (Rp)" className={inputClass} defaultValue={Number(t.jumlah)} required />
          </>
        )}
        <input name="keterangan" placeholder="Keterangan" defaultValue={t.keterangan ?? ""} className={inputClass} />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="keteranganRahasia" defaultChecked={t.keteranganRahasia} />
          Rahasiakan keterangan (hanya bendahara dan pemilik yang bisa membaca)
        </label>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            {t.buktiUrl ? "Ganti bukti transfer (kosongkan untuk pakai yang lama)" : "Bukti transfer (opsional)"}
          </label>
          <input
            type="file"
            name="bukti"
            accept="image/jpeg,image/png,image/webp"
            className="w-full text-xs"
            onChange={(e) => setFileError(e.target.files?.[0] ? validasiFileGambar(e.target.files[0]) : null)}
          />
        </div>
        {(fileError ?? serverError) && <p className="text-xs text-danger">{fileError ?? serverError}</p>}
        <div className="flex gap-2">
          <TombolSimpan disabled={!!fileError} />
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setFileError(null);
              setServerError(null);
            }}
            className={btnGhost}
          >
            Batal
          </button>
        </div>
      </form>
    </Card>
  );
}
