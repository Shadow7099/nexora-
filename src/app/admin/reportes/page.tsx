import type { Metadata } from "next";
import { FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { PhaseNotice } from "@/components/layout/phase-notice";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/server/current";

export const metadata: Metadata = { title: "Reportes" };

const reports = [
  { title: "Asistencia por período", text: "Marcaciones, jornadas, tardanzas y ausencias por empleado y sede." },
  { title: "Horas extra", text: "Tiempo registrado, autorizado y tratamiento en pre-nómina, con quién decidió." },
  { title: "Novedades", text: "Vacaciones, incapacidades, permisos y licencias del período." },
  { title: "Pre-nómina estimada", text: "Devengados, deducciones y costo del empleador, con los parámetros usados." },
  { title: "Intentos rechazados", text: "Marcaciones fuera del radio o desde celulares no vinculados." },
];

export default async function ReportsPage() {
  await requireActor({ roles: ["COMPANY_ADMIN"] });
  return (
    <>
      <PageHeader title="Reportes" description="Cada reporte indica empresa, período y fecha de generación" />
      <PhaseNotice phase={7}>Exportación a Excel, CSV y PDF con filtros por fechas, sedes y empleados, más los gráficos del panel.</PhaseNotice>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{r.title}</p>
              <FileSpreadsheet className="size-4 text-fg-subtle" aria-hidden />
            </div>
            <p className="mt-1 text-sm text-fg-muted">{r.text}</p>
            <div className="mt-4 flex gap-2">
              <Badge><Sheet className="size-3" /> Excel</Badge>
              <Badge>CSV</Badge>
              <Badge><FileText className="size-3" /> PDF</Badge>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
