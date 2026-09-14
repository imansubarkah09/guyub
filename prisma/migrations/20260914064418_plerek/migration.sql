-- AlterEnum
ALTER TYPE "SumberDana" ADD VALUE 'plerek';

-- CreateTable
CREATE TABLE "PlerekPutaran" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "petugas" TEXT,
    "jumlahUang" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "berasKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "keterangan" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlerekPutaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlerekBerasKeluar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "berasKg" DECIMAL(10,2) NOT NULL,
    "hasilPenjualan" DECIMAL(14,2),
    "keterangan" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlerekBerasKeluar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlerekSetoranKas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "kasTransaksiId" TEXT NOT NULL,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlerekSetoranKas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlerekPutaran_tenantId_tanggal_idx" ON "PlerekPutaran"("tenantId", "tanggal");

-- CreateIndex
CREATE INDEX "PlerekBerasKeluar_tenantId_tanggal_idx" ON "PlerekBerasKeluar"("tenantId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "PlerekSetoranKas_kasTransaksiId_key" ON "PlerekSetoranKas"("kasTransaksiId");

-- CreateIndex
CREATE INDEX "PlerekSetoranKas_tenantId_tanggal_idx" ON "PlerekSetoranKas"("tenantId", "tanggal");

-- AddForeignKey
ALTER TABLE "PlerekPutaran" ADD CONSTRAINT "PlerekPutaran_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlerekPutaran" ADD CONSTRAINT "PlerekPutaran_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlerekBerasKeluar" ADD CONSTRAINT "PlerekBerasKeluar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlerekBerasKeluar" ADD CONSTRAINT "PlerekBerasKeluar_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlerekSetoranKas" ADD CONSTRAINT "PlerekSetoranKas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlerekSetoranKas" ADD CONSTRAINT "PlerekSetoranKas_kasTransaksiId_fkey" FOREIGN KEY ("kasTransaksiId") REFERENCES "KasTransaksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlerekSetoranKas" ADD CONSTRAINT "PlerekSetoranKas_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

