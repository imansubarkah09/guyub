import Link from "next/link";
import { UserPlus } from "lucide-react";
import { AuthScreen } from "@/components/auth-screen";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function RegisterPage() {
  return (
    <AuthScreen
      icon={UserPlus}
      title="Daftarkan Tenant Anda"
      description="Daftar dengan akun Google, lalu buat tenant keluarga, RT, atau paguyuban Anda. Tidak perlu bikin akun atau kata sandi baru."
      footer={
        <>
          Sudah punya tenant?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk di sini
          </Link>
        </>
      }
    >
      <GoogleSignInButton callbackURL="/dashboard" label="Daftar dengan Google" />
    </AuthScreen>
  );
}
