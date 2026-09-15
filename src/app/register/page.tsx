import Link from "next/link";
import { UserPlus } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {/* Pola yang sama dengan login/page.tsx — lingkaran tint primary, halaman
          ini sebelumnya polos sama sekali (§colorize, 15 Sep 2026). */}
      <div className="rounded-full bg-primary/10 p-4">
        <UserPlus className="h-7 w-7 text-primary" />
      </div>
      <h1 className="text-xl font-semibold">Daftarkan Tenant Anda</h1>
      <p className="max-w-sm text-sm text-muted">Daftar dengan akun Google, lalu buat tenant keluarga, RT, atau paguyuban Anda. Tidak perlu bikin akun atau kata sandi baru.</p>
      <GoogleSignInButton callbackURL="/dashboard" label="Daftar dengan Google" />
      <p className="text-sm text-muted">
        Sudah punya tenant?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Masuk di sini
        </Link>
      </p>
    </main>
  );
}
