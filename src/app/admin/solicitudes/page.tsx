import type { Metadata } from "next";
import { Inbox, Timer, CalendarX } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { PhaseNotice } from "@/components/layout/phase-notice";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireActor } from "@/server/current";
import { requestsSummary } from "@/server/modules";

export const metadata: Metadata = { title: "Solicitudes" };

export default async function RequestsPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const r = await requestsSummary(actor);
  return (
    <>
      <PageHeader title="Solicitudes" description="Horas extra, permisos, vacaciones e incapacidades" />
      <PhaseNotice phase={5}>
        Aprobarás o rechazarás horas extra con observaciones y quedará registrado quién decidió. Rechazar una hora extra no borra el tiempo trabajado:
        solo cambia cómo se trata en la pre-nómina.
      </PhaseNotice>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Horas extra por aprobar" value={String(r.overtime)} icon={Timer} />
        <StatCard label="Novedades por aprobar" value={String(r.novelties)} icon={CalendarX} />
      </div>
      <Card className="mt-6">
        <EmptyState icon={Inbox} title="Sin solicitudes pendientes" description="Cuando un empleado supere su jornada o pida un permiso, la solicitud aparecerá aquí." />
      </Card>
    </>
  );
}
