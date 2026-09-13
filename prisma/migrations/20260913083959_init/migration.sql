-- CreateEnum
CREATE TYPE "TenantJenis" AS ENUM ('keluarga', 'rt', 'paguyuban');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('pending', 'approved', 'suspended');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ketua', 'bendahara', 'sekretaris', 'anggota');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('pending_confirmation', 'active', 'removed');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "KasTipe" AS ENUM ('masuk', 'keluar');

-- CreateEnum
CREATE TYPE "TabunganMode" AS ENUM ('individual', 'pooled');

-- CreateEnum
CREATE TYPE "JenisHewan" AS ENUM ('sapi', 'kambing');

-- CreateEnum
CREATE TYPE "QurbanGroupStatus" AS ENUM ('terbuka', 'lunas', 'selesai');

-- CreateEnum
CREATE TYPE "QurbanSlotStatus" AS ENUM ('belum', 'lunas');

-- CreateEnum
CREATE TYPE "ArisanStatus" AS ENUM ('berjalan', 'selesai');

-- CreateEnum
CREATE TYPE "TenantApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "jenis" "TenantJenis" NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "logoUrl" TEXT,
    "alamat" TEXT,

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roles" "Role"[],
    "status" "MembershipStatus" NOT NULL DEFAULT 'pending_confirmation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyNode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "parentId" TEXT,
    "spouseId" TEXT,
    "userId" TEXT,

    CONSTRAINT "FamilyNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KasTransaksi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "tipe" "KasTipe" NOT NULL,
    "keterangan" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KasTransaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabunganTipe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "mode" "TabunganMode" NOT NULL,

    CONSTRAINT "TabunganTipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabunganSaldo" (
    "id" TEXT NOT NULL,
    "tabunganTipeId" TEXT NOT NULL,
    "userId" TEXT,
    "jumlah" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "TabunganSaldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jenisHewan" "JenisHewan" NOT NULL,
    "targetPerJiwa" DECIMAL(14,2) NOT NULL,
    "status" "QurbanGroupStatus" NOT NULL DEFAULT 'terbuka',

    CONSTRAINT "QurbanGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanSlot" (
    "id" TEXT NOT NULL,
    "qurbanGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saldoTerkumpul" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "QurbanSlotStatus" NOT NULL DEFAULT 'belum',

    CONSTRAINT "QurbanSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arisan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "jumlahSetoran" DECIMAL(14,2) NOT NULL,
    "status" "ArisanStatus" NOT NULL DEFAULT 'berjalan',

    CONSTRAINT "Arisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArisanPeserta" (
    "id" TEXT NOT NULL,
    "arisanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "statusDapat" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ArisanPeserta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laporan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "shareLink" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Laporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApprovalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "TenantApprovalStatus" NOT NULL DEFAULT 'pending',
    "catatanOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "TenantProfile_tenantId_key" ON "TenantProfile"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_tenantId_idx" ON "Invitation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyNode_spouseId_key" ON "FamilyNode"("spouseId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyNode_userId_key" ON "FamilyNode"("userId");

-- CreateIndex
CREATE INDEX "FamilyNode_tenantId_idx" ON "FamilyNode"("tenantId");

-- CreateIndex
CREATE INDEX "KasTransaksi_tenantId_tanggal_idx" ON "KasTransaksi"("tenantId", "tanggal");

-- CreateIndex
CREATE INDEX "TabunganTipe_tenantId_idx" ON "TabunganTipe"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TabunganSaldo_tabunganTipeId_userId_key" ON "TabunganSaldo"("tabunganTipeId", "userId");

-- CreateIndex
CREATE INDEX "QurbanGroup_tenantId_idx" ON "QurbanGroup"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "QurbanSlot_qurbanGroupId_userId_key" ON "QurbanSlot"("qurbanGroupId", "userId");

-- CreateIndex
CREATE INDEX "Arisan_tenantId_idx" ON "Arisan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ArisanPeserta_arisanId_userId_key" ON "ArisanPeserta"("arisanId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Laporan_shareLink_key" ON "Laporan"("shareLink");

-- CreateIndex
CREATE INDEX "Laporan_tenantId_idx" ON "Laporan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantApprovalRequest_tenantId_key" ON "TenantApprovalRequest"("tenantId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProfile" ADD CONSTRAINT "TenantProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNode" ADD CONSTRAINT "FamilyNode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNode" ADD CONSTRAINT "FamilyNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FamilyNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNode" ADD CONSTRAINT "FamilyNode_spouseId_fkey" FOREIGN KEY ("spouseId") REFERENCES "FamilyNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNode" ADD CONSTRAINT "FamilyNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasTransaksi" ADD CONSTRAINT "KasTransaksi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasTransaksi" ADD CONSTRAINT "KasTransaksi_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabunganTipe" ADD CONSTRAINT "TabunganTipe_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabunganSaldo" ADD CONSTRAINT "TabunganSaldo_tabunganTipeId_fkey" FOREIGN KEY ("tabunganTipeId") REFERENCES "TabunganTipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabunganSaldo" ADD CONSTRAINT "TabunganSaldo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanGroup" ADD CONSTRAINT "QurbanGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanSlot" ADD CONSTRAINT "QurbanSlot_qurbanGroupId_fkey" FOREIGN KEY ("qurbanGroupId") REFERENCES "QurbanGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanSlot" ADD CONSTRAINT "QurbanSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arisan" ADD CONSTRAINT "Arisan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanPeserta" ADD CONSTRAINT "ArisanPeserta_arisanId_fkey" FOREIGN KEY ("arisanId") REFERENCES "Arisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanPeserta" ADD CONSTRAINT "ArisanPeserta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApprovalRequest" ADD CONSTRAINT "TenantApprovalRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
