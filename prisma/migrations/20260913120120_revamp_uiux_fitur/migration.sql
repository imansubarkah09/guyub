-- CreateEnum
CREATE TYPE "SumberDana" AS ENUM ('kas', 'infaq', 'tabungan');

-- AlterTable
ALTER TABLE "Arisan" ADD COLUMN     "jadwalTanggal" TIMESTAMP(3),
ADD COLUMN     "jadwalTempat" TEXT,
ADD COLUMN     "putaranBerjalan" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Laporan" ADD COLUMN     "totalKeluar" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalMasuk" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "ArisanPembayaran" (
    "id" TEXT NOT NULL,
    "arisanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "putaran" INTEGER NOT NULL,
    "tanggalBayar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArisanPembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfaqShodaqoh" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggalPertemuan" TIMESTAMP(3) NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "keterangan" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfaqShodaqoh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DanaKegiatan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "namaKegiatan" TEXT NOT NULL,
    "sumberDana" "SumberDana" NOT NULL,
    "sumberTabunganTipeId" TEXT,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "keterangan" TEXT,
    "buktiUrl" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DanaKegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "tipe" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "href" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArisanPembayaran_arisanId_putaran_idx" ON "ArisanPembayaran"("arisanId", "putaran");

-- CreateIndex
CREATE UNIQUE INDEX "ArisanPembayaran_arisanId_userId_putaran_key" ON "ArisanPembayaran"("arisanId", "userId", "putaran");

-- CreateIndex
CREATE INDEX "InfaqShodaqoh_tenantId_tanggalPertemuan_idx" ON "InfaqShodaqoh"("tenantId", "tanggalPertemuan");

-- CreateIndex
CREATE INDEX "DanaKegiatan_tenantId_tanggal_idx" ON "DanaKegiatan"("tenantId", "tanggal");

-- CreateIndex
CREATE INDEX "Notifikasi_userId_isRead_createdAt_idx" ON "Notifikasi"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "ArisanPembayaran" ADD CONSTRAINT "ArisanPembayaran_arisanId_fkey" FOREIGN KEY ("arisanId") REFERENCES "Arisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanPembayaran" ADD CONSTRAINT "ArisanPembayaran_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfaqShodaqoh" ADD CONSTRAINT "InfaqShodaqoh_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfaqShodaqoh" ADD CONSTRAINT "InfaqShodaqoh_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanaKegiatan" ADD CONSTRAINT "DanaKegiatan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanaKegiatan" ADD CONSTRAINT "DanaKegiatan_sumberTabunganTipeId_fkey" FOREIGN KEY ("sumberTabunganTipeId") REFERENCES "TabunganTipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanaKegiatan" ADD CONSTRAINT "DanaKegiatan_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

