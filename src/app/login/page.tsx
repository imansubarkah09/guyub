import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Masuk ke Guyub</h1>
      <p className="max-w-sm text-sm text-muted">Masuk dengan akun Google untuk mengelola kas, tabungan, qurban joinan, dan kegiatan tenant Anda.</p>
      <GoogleSignInButton callbackURL="/dashboard" />
      <p className="text-sm text-muted">
        Ketua baru?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Daftarkan tenant Anda
        </Link>
      </p>
    </main>
  );
}
