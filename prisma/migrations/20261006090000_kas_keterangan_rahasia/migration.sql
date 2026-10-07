-- Keterangan Kas yang hanya boleh dilihat bendahara dan pemilik.
ALTER TABLE "KasTransaksi" ADD COLUMN "keteranganRahasia" BOOLEAN NOT NULL DEFAULT false;

-- Baris lama: semua kas masuk yang keterangannya menyebut "cicilan" (cicilan Simpan Pinjam
-- yang dulu memuat nama peminjam, plus catatan manual bendahara seperti "cicilan a.n. ...").
UPDATE "KasTransaksi"
SET "keteranganRahasia" = true
WHERE "tipe" = 'masuk' AND "keterangan" ILIKE '%cicilan%';
