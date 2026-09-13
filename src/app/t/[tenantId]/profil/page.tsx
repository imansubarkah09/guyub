import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_UPDATE_PROFIL, has } from "@/lib/authz";
import { updateProfilAction } from "./actions";

export default async function ProfilPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const [me, profile] = await Promise.all([
    prisma.membership.findUniqueOrThrow({ where: { userId_tenantId: { userId: user.id, tenantId } } }),
    prisma.tenantProfile.findUniqueOrThrow({ where: { tenantId } }),
  ]);

  if (!has(me.roles, CAN_UPDATE_PROFIL)) {
    return (
      <div className="space-y-2 text-sm">
        {profile.logoUrl && <img src={profile.logoUrl} alt="" className="h-16 w-16 rounded-md object-cover" />}
        <p className="font-medium">{profile.nama}</p>
        {profile.alamat && <p className="text-foreground/60">{profile.alamat}</p>}
      </div>
    );
  }

  return (
    <form action={updateProfilAction} className="space-y-3" encType="multipart/form-data">
      <input type="hidden" name="tenantId" value={tenantId} />
      {profile.logoUrl && <img src={profile.logoUrl} alt="" className="h-16 w-16 rounded-md object-cover" />}
      <div>
        <label className="mb-1 block text-xs font-medium">Nama Tenant</label>
        <input name="nama" defaultValue={profile.nama} required className="w-full rounded-md border border-primary/30 p-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Alamat</label>
        <textarea name="alamat" defaultValue={profile.alamat ?? ""} className="w-full rounded-md border border-primary/30 p-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Logo</label>
        <input type="file" name="logo" accept="image/*" className="w-full text-sm" />
      </div>
      <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
        Simpan
      </button>
    </form>
  );
}
