import Link from "next/link";
import { Users } from "lucide-react";
import { AuthScreen } from "@/components/auth-screen";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  return (
    <AuthScreen
      icon={Users}
      title="Masuk ke Guyub"
      description="Masuk dengan akun Google untuk mengelola kas, tabungan, qurban joinan, dan kegiatan tenant Anda."
      footer={
        <>
          Ketua baru?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Daftarkan tenant Anda
          </Link>
        </>
      }
    >
      <GoogleSignInButton callbackURL="/dashboard" />
    </AuthScreen>
  );
}
