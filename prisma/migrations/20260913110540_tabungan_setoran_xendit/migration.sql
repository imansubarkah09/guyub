-- CreateEnum
CREATE TYPE "SetoranMetode" AS ENUM ('manual', 'xendit');

-- AlterTable
ALTER TABLE "TabunganSetoran" ADD COLUMN     "metode" "SetoranMetode" NOT NULL DEFAULT 'manual',
ADD COLUMN     "xenditInvoiceId" TEXT,
ADD COLUMN     "xenditInvoiceUrl" TEXT,
ALTER COLUMN "buktiUrl" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TabunganSetoran_xenditInvoiceId_key" ON "TabunganSetoran"("xenditInvoiceId");

