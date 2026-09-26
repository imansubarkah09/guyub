import type { LucideIcon } from "lucide-react";

/**
 * Bungkus login & register — sama persis dulu, keduanya cuma badge ikon +
 * judul + deskripsi + CTA + link footer yang di-copy-paste (§polish, 26 Sep
 * 2026). Kartu di atas gradasi hangat + animate-in, gantikan teks polos
 * mengambang di background flat.
 */
export function AuthScreen({
  icon: Icon,
  title,
  description,
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--primary)_0%,transparent_100%)] opacity-[0.08]"
      />
      <div className="animate-in relative w-full max-w-sm space-y-5 rounded-[var(--radius)] border border-border bg-surface p-7 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-col items-center gap-4">{children}</div>
        {footer && <p className="text-sm text-muted">{footer}</p>}
      </div>
    </main>
  );
}
