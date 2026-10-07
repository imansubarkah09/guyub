-- Pemilik: peran di atas ketua dengan kendali penuh termasuk transaksi uang
-- (lihat src/lib/authz.ts). Perannya SELALU tampil di daftar anggota, tidak
-- pernah disembunyikan, dan setiap aksinya dicatat di AuditLog.
-- Ditulis tangan, bukan hasil `migrate dev`, karena migrasi lama sempat
-- diubah setelah diterapkan sehingga `migrate dev` minta reset database dev.
ALTER TYPE "Role" ADD VALUE 'pemilik' BEFORE 'ketua';

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aktorId" TEXT NOT NULL,
    "peran" "Role" NOT NULL,
    "aksi" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "nominal" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_aktorId_fkey" FOREIGN KEY ("aktorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
