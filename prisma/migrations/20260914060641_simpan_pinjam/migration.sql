-- CreateEnum
CREATE TYPE "PinjamanStatus" AS ENUM ('diajukan', 'disetujui', 'ditolak', 'lunas');

-- CreateEnum
CREATE TYPE "BungaMode" AS ENUM ('tanpa', 'persen', 'sukarela');

-- CreateTable
CREATE TABLE "Pinjaman" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "peminjamId" TEXT NOT NULL,
    "jumlahPokok" DECIMAL(14,2) NOT NULL,
    "bungaMode" "BungaMode" NOT NULL DEFAULT 'tanpa',
    "bungaPersen" DECIMAL(5,2),
    "keterangan" TEXT,
    "status" "PinjamanStatus" NOT NULL DEFAULT 'diajukan',
    "diajukanPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diputuskanOlehId" TEXT,
    "diputuskanPada" TIMESTAMP(3),

    CONSTRAINT "Pinjaman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinjamanCicilan" (
    "id" TEXT NOT NULL,
    "pinjamanId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jumlahPokok" DECIMAL(14,2) NOT NULL,
    "jumlahBunga" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinjamanCicilan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pinjaman_tenantId_status_idx" ON "Pinjaman"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Pinjaman_peminjamId_idx" ON "Pinjaman"("peminjamId");

-- CreateIndex
CREATE INDEX "PinjamanCicilan_pinjamanId_idx" ON "PinjamanCicilan"("pinjamanId");

-- AddForeignKey
ALTER TABLE "Pinjaman" ADD CONSTRAINT "Pinjaman_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pinjaman" ADD CONSTRAINT "Pinjaman_peminjamId_fkey" FOREIGN KEY ("peminjamId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pinjaman" ADD CONSTRAINT "Pinjaman_diputuskanOlehId_fkey" FOREIGN KEY ("diputuskanOlehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinjamanCicilan" ADD CONSTRAINT "PinjamanCicilan_pinjamanId_fkey" FOREIGN KEY ("pinjamanId") REFERENCES "Pinjaman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinjamanCicilan" ADD CONSTRAINT "PinjamanCicilan_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

