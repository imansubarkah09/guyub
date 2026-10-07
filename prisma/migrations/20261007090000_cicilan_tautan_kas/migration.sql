-- Tautan cicilan Simpan Pinjam ke baris Kas yang dibuatnya. Tanpa tautan ini cicilan
-- yang salah input tidak bisa dibatalkan dengan rapi, dan bendahara terpaksa
-- mengedit baris Kas sehingga Kas dan Pinjaman tidak cocok lagi (kejadian 3 Okt 2026).
ALTER TABLE "PinjamanCicilan" ADD COLUMN "kasTransaksiId" TEXT;

CREATE UNIQUE INDEX "PinjamanCicilan_kasTransaksiId_key" ON "PinjamanCicilan"("kasTransaksiId");

ALTER TABLE "PinjamanCicilan" ADD CONSTRAINT "PinjamanCicilan_kasTransaksiId_fkey" FOREIGN KEY ("kasTransaksiId") REFERENCES "KasTransaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Isi tautan untuk cicilan lama. catatCicilanAction membuat cicilan lalu baris Kas-nya
-- dalam satu transaksi, jadi pasangannya: tenant dan pencatat sama, dibuat paling lama
-- 5 detik sesudahnya, dan nominalnya masih persis pokok + bunga. Baris yang nominalnya
-- sudah diedit sengaja tidak ditautkan. Hanya pasangan yang tunggal di kedua sisi yang
-- diisi, supaya unique index di atas tidak mungkin dilanggar.
WITH kandidat AS (
  SELECT c.id AS cid, k.id AS kid
  FROM "PinjamanCicilan" c
  JOIN "Pinjaman" p ON p.id = c."pinjamanId"
  JOIN "KasTransaksi" k
    ON k."tenantId" = p."tenantId"
   AND k."dicatatOlehId" = c."dicatatOlehId"
   AND k.tipe = 'masuk'
   AND k.keterangan ILIKE 'Cicilan pinjaman%'
   AND k.jumlah = c."jumlahPokok" + c."jumlahBunga"
   AND k."createdAt" BETWEEN c."createdAt" AND c."createdAt" + INTERVAL '5 seconds'
),
unik AS (
  SELECT cid, kid FROM kandidat
  WHERE cid IN (SELECT cid FROM kandidat GROUP BY cid HAVING COUNT(*) = 1)
    AND kid IN (SELECT kid FROM kandidat GROUP BY kid HAVING COUNT(*) = 1)
)
UPDATE "PinjamanCicilan" c
SET "kasTransaksiId" = unik.kid
FROM unik
WHERE c.id = unik.cid;
