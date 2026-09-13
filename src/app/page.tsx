export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-primary">Guyub</h1>
      <p className="max-w-sm text-sm text-foreground/70">
        Kas &amp; tabungan keluarga, RT, atau paguyuban — sedang dibangun.
      </p>
      <a href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Masuk
      </a>
    </main>
  );
}
