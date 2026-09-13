-- Urutan anak, diisi manual karena urutan input sering beda dari urutan kelahiran.
ALTER TABLE "FamilyNode" ADD COLUMN "urutan" INTEGER;

-- userId dulu unik global sehingga satu akun cuma bisa punya posisi di satu
-- tenant. Diganti unik per tenant supaya satu orang bisa ada di pohon keluarga
-- sendiri sekaligus pohon paguyuban lain.
DROP INDEX IF EXISTS "FamilyNode_userId_key";
CREATE UNIQUE INDEX "FamilyNode_tenantId_userId_key" ON "FamilyNode"("tenantId", "userId");
