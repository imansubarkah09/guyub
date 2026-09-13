-- CreateEnum
CREATE TYPE "UndianStatus" AS ENUM ('menang', 'dibatalkan');

-- AlterEnum
ALTER TYPE "SumberDana" ADD VALUE 'donasi';

-- DropForeignKey
ALTER TABLE "DanaKegiatan" DROP CONSTRAINT "DanaKegiatan_sumberTabunganTipeId_fkey";

-- DropIndex
DROP INDEX "ArisanPeserta_arisanId_userId_key";

-- AlterTable
ALTER TABLE "Arisan" ADD COLUMN     "kandidatTuanRumahId" TEXT,
ADD COLUMN     "pemenangPerPutaran" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "potonganKeterangan" TEXT,
ADD COLUMN     "potonganPersen" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ArisanPeserta" ADD COLUMN     "nomorSlot" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "putaranDapat" INTEGER;

-- AlterTable
ALTER TABLE "DanaKegiatan" DROP COLUMN "jumlah",
DROP COLUMN "sumberDana",
DROP COLUMN "sumberTabunganTipeId",
ADD COLUMN     "targetDana" DECIMAL(14,2);

-- AlterTable
-- kodeDonasi NOT NULL pada tabel yang sudah berisi baris: isi dulu baris lama
-- dengan kode acak (Prisma menghasilkan cuid() di aplikasi, bukan di DB),
-- baru kolomnya dijadikan NOT NULL.
ALTER TABLE "Tenant" ADD COLUMN     "kodeDonasi" TEXT,
ADD COLUMN     "nyawaSampai" TIMESTAMP(3);
UPDATE "Tenant" SET "kodeDonasi" = upper(substr(md5(random()::text || id), 1, 8)) WHERE "kodeDonasi" IS NULL;
ALTER TABLE "Tenant" ALTER COLUMN "kodeDonasi" SET NOT NULL;

-- CreateTable
CREATE TABLE "ArisanUndian" (
    "id" TEXT NOT NULL,
    "arisanId" TEXT NOT NULL,
    "pesertaId" TEXT NOT NULL,
    "putaran" INTEGER NOT NULL,
    "status" "UndianStatus" NOT NULL DEFAULT 'menang',
    "jumlahDiterima" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArisanUndian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DanaKegiatanSumber" (
    "id" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "sumberDana" "SumberDana" NOT NULL,
    "sumberTabunganTipeId" TEXT,
    "jumlah" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "DanaKegiatanSumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DanaKegiatanDonasi" (
    "id" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "namaDonatur" TEXT NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DanaKegiatanDonasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrakteerDonasi" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT,
    "namaDonatur" TEXT NOT NULL,
    "pesan" TEXT,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "hariNyawa" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrakteerDonasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArisanUndian_arisanId_putaran_idx" ON "ArisanUndian"("arisanId", "putaran");

-- CreateIndex
CREATE INDEX "DanaKegiatanSumber_kegiatanId_idx" ON "DanaKegiatanSumber"("kegiatanId");

-- CreateIndex
CREATE INDEX "DanaKegiatanDonasi_kegiatanId_idx" ON "DanaKegiatanDonasi"("kegiatanId");

-- CreateIndex
CREATE UNIQUE INDEX "TrakteerDonasi_orderId_key" ON "TrakteerDonasi"("orderId");

-- CreateIndex
CREATE INDEX "TrakteerDonasi_tenantId_createdAt_idx" ON "TrakteerDonasi"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TrakteerDonasi_jumlah_idx" ON "TrakteerDonasi"("jumlah");

-- CreateIndex
CREATE UNIQUE INDEX "Arisan_kandidatTuanRumahId_key" ON "Arisan"("kandidatTuanRumahId");

-- CreateIndex
CREATE INDEX "ArisanPeserta_arisanId_statusDapat_idx" ON "ArisanPeserta"("arisanId", "statusDapat");

-- CreateIndex
CREATE UNIQUE INDEX "ArisanPeserta_arisanId_userId_nomorSlot_key" ON "ArisanPeserta"("arisanId", "userId", "nomorSlot");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_kodeDonasi_key" ON "Tenant"("kodeDonasi");

-- AddForeignKey
ALTER TABLE "Arisan" ADD CONSTRAINT "Arisan_kandidatTuanRumahId_fkey" FOREIGN KEY ("kandidatTuanRumahId") REFERENCES "ArisanPeserta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanUndian" ADD CONSTRAINT "ArisanUndian_arisanId_fkey" FOREIGN KEY ("arisanId") REFERENCES "Arisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanUndian" ADD CONSTRAINT "ArisanUndian_pesertaId_fkey" FOREIGN KEY ("pesertaId") REFERENCES "ArisanPeserta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanaKegiatanSumber" ADD CONSTRAINT "DanaKegiatanSumber_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "DanaKegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanaKegiatanSumber" ADD CONSTRAINT "DanaKegiatanSumber_sumberTabunganTipeId_fkey" FOREIGN KEY ("sumberTabunganTipeId") REFERENCES "TabunganTipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanaKegiatanDonasi" ADD CONSTRAINT "DanaKegiatanDonasi_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "DanaKegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrakteerDonasi" ADD CONSTRAINT "TrakteerDonasi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

