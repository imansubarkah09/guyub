import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Masuk ke Guyub</h1>
      <GoogleSignInButton callbackURL="/dashboard" />
    </main>
  );
}
