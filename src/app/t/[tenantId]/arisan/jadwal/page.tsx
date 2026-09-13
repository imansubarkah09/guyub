import { CalendarDays, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CAN_ATUR_ARISAN, has } from "@/lib/authz";
import { effectiveRoles } from "@/lib/effective-roles";
import { Card, PageTitle, EmptyState, btnPrimary, inputClass, tanggal } from "@/components/ui";
import { updateJadwalAction } from "../actions";

export default async function JadwalArisanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const user = await requireUser();
  const { roles, readOnly } = await effectiveRoles(user, tenantId);

  const arisanList = await prisma.arisan.findMany({ where: { tenantId, status: "berjalan" }, orderBy: { id: "desc" } });
  const canAtur = has(roles, CAN_ATUR_ARISAN) && !readOnly;

  return (
    <div className="space-y-5">
      <PageTitle title="Jadwal Pertemuan" desc="Tanggal & tempat pertemuan arisan berikutnya" />

      {arisanList.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Belum ada arisan berjalan" desc="Jadwal pertemuan muncul setelah ada arisan yang berjalan." />
      ) : (
        arisanList.map((a) => (
          <Card key={a.id} className="space-y-3">
            <p className="font-medium">{a.periode}</p>

            {a.jadwalTanggal ? (
              <div className="rounded-lg bg-accent/5 p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  {tanggal.format(a.jadwalTanggal)}
                </p>
                {a.jadwalTempat && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                    <MapPin className="h-4 w-4" />
                    {a.jadwalTempat}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Jadwal pertemuan berikutnya belum ditentukan.</p>
            )}

            {canAtur && (
              <form action={updateJadwalAction} className="space-y-2 border-t border-border pt-3">
                <input type="hidden" name="tenantId" value={tenantId} />
                <input type="hidden" name="arisanId" value={a.id} />
                <input
                  type="date"
                  name="jadwalTanggal"
                  defaultValue={a.jadwalTanggal ? a.jadwalTanggal.toISOString().slice(0, 10) : ""}
                  className={inputClass}
                />
                <input name="jadwalTempat" defaultValue={a.jadwalTempat ?? ""} placeholder="Tempat, misal: Rumah Pak Widodo" className={inputClass} />
                <button type="submit" className={`${btnPrimary} w-full`}>
                  Simpan Jadwal
                </button>
              </form>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
