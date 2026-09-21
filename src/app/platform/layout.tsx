import { requireUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/authz";
import { PlatformShell } from "@/components/platform-shell";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  requirePlatformOwner(user);

  return (
    <PlatformShell account={{ name: user.name, email: user.email, phone: user.phone ?? null, image: user.image ?? null, isPlatformOwner: user.isPlatformOwner }}>
      {children}
    </PlatformShell>
  );
}
