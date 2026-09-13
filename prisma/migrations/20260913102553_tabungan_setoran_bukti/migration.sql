-- CreateEnum
CREATE TYPE "SetoranStatus" AS ENUM ('pending', 'valid', 'ditolak');

-- AlterTable
ALTER TABLE "KasTransaksi" ADD COLUMN     "buktiUrl" TEXT;

-- CreateTable
CREATE TABLE "TabunganSetoran" (
    "id" TEXT NOT NULL,
    "tabunganTipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "buktiUrl" TEXT NOT NULL,
    "status" "SetoranStatus" NOT NULL DEFAULT 'pending',
    "catatanBendahara" TEXT,
    "divalidasiOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TabunganSetoran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TabunganSetoran_tabunganTipeId_status_idx" ON "TabunganSetoran"("tabunganTipeId", "status");

-- AddForeignKey
ALTER TABLE "TabunganSetoran" ADD CONSTRAINT "TabunganSetoran_tabunganTipeId_fkey" FOREIGN KEY ("tabunganTipeId") REFERENCES "TabunganTipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabunganSetoran" ADD CONSTRAINT "TabunganSetoran_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabunganSetoran" ADD CONSTRAINT "TabunganSetoran_divalidasiOlehId_fkey" FOREIGN KEY ("divalidasiOlehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
