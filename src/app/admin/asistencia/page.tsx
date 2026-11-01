import type { Metadata } from "next";
import { ClipboardCheck, LogIn, ShieldAlert, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { PhaseNotice } from "@/components/layout/phase-notice";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireActor } from "@/server/current";
import { attendanceSummary } from "@/server/modules";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AttendancePage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const a = await attendanceSummary(actor);
  return (
    <>
      <PageHeader title="Asistencia" description="Marcaciones con QR por sede, validadas por ubicación y dispositivo" />
      <PhaseNotice phase={4}>
        Aquí verás quién está presente, llegadas tarde, jornadas abiertas e intentos rechazados (fuera del radio, celular no vinculado). La base de
        datos ya está lista y protegida: las marcaciones no se pueden editar ni borrar.
      </PhaseNotice>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Marcaciones registradas" value={String(a.events)} icon={ClipboardCheck} />
        <StatCard label="Jornadas abiertas" value={String(a.openSessions)} icon={LogIn} />
        <StatCard label="Intentos rechazados" value={String(a.attempts)} icon={ShieldAlert} />
        <StatCard label="Celulares por aprobar" value={String(a.pendingDevices)} icon={Smartphone} />
      </div>
      <Card className="mt-6">
        <EmptyState icon={ClipboardCheck} title="Todavía no hay marcaciones" description="Aparecerán aquí en tiempo real cuando los empleados escaneen el QR de su sede." />
      </Card>
    </>
  );
}
