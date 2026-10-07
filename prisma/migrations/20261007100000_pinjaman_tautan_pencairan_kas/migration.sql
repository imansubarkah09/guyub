-- Tautan pinjaman ke baris Kas pencairannya, supaya nominal baris itu bisa dikunci di
-- form edit Kas seperti baris cicilan (lihat 20261007090000_cicilan_tautan_kas).
ALTER TABLE "Pinjaman" ADD COLUMN "kasPencairanId" TEXT;

CREATE UNIQUE INDEX "Pinjaman_kasPencairanId_key" ON "Pinjaman"("kasPencairanId");

ALTER TABLE "Pinjaman" ADD CONSTRAINT "Pinjaman_kasPencairanId_fkey" FOREIGN KEY ("kasPencairanId") REFERENCES "KasTransaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Isi tautan untuk pencairan lama. putuskanPinjamanAction mengubah status lalu membuat
-- baris Kas keluar dalam satu transaksi, jadi pasangannya: tenant sama, dicatat oleh
-- yang memutuskan, dibuat paling lama 5 detik sesudah diputuskanPada, dan nominalnya
-- masih persis jumlah pokok. Hanya pasangan yang tunggal di kedua sisi yang diisi.
WITH kandidat AS (
  SELECT p.id AS pid, k.id AS kid
  FROM "Pinjaman" p
  JOIN "KasTransaksi" k
    ON k."tenantId" = p."tenantId"
   AND k."dicatatOlehId" = p."diputuskanOlehId"
   AND k.tipe = 'keluar'
   AND k.keterangan ILIKE 'Pencairan pinjaman%'
   AND k.jumlah = p."jumlahPokok"
   AND k."createdAt" BETWEEN p."diputuskanPada" AND p."diputuskanPada" + INTERVAL '5 seconds'
  WHERE p.status IN ('disetujui', 'lunas')
),
unik AS (
  SELECT pid, kid FROM kandidat
  WHERE pid IN (SELECT pid FROM kandidat GROUP BY pid HAVING COUNT(*) = 1)
    AND kid IN (SELECT kid FROM kandidat GROUP BY kid HAVING COUNT(*) = 1)
)
UPDATE "Pinjaman" p
SET "kasPencairanId" = unik.kid
FROM unik
WHERE p.id = unik.pid;
