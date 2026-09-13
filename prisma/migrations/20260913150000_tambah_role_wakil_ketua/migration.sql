-- Wakil ketua: izinnya sama persis dengan ketua (lihat src/lib/authz.ts).
-- Ditulis tangan, bukan hasil `migrate dev`, karena dua migrasi lama sempat
-- diubah setelah diterapkan sehingga `migrate dev` minta reset database dev.
ALTER TYPE "Role" ADD VALUE 'wakil_ketua' AFTER 'ketua';
