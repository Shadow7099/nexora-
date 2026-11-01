import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { PhaseNotice } from "@/components/layout/phase-notice";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { contractTypeLabel, payFrequencyLabel } from "@/lib/labels";
import { formatCOP } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { payrollPreview } from "@/server/modules";

export const metadata: Metadata = { title: "Pre-nómina" };

const concepts = [
  "Salario básico del período",
  "Horas extra diurnas y nocturnas (solo las aprobadas)",
  "Recargo nocturno",
  "Trabajo en domingos y festivos",
  "Auxilio de transporte (si aplica)",
  "Deducciones de salud y pensión del trabajador",
  "Aportes y provisiones del empleador (costo estimado)",
];

export default async function PayrollPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const p = await payrollPreview(actor);
  const total = p.employees.reduce((acc, e) => acc + Number(e.contracts[0]?.monthlySalary ?? 0), 0);

  return (
    <>
      <PageHeader title="Pre-nómina" description="Estimación, no liquidación legal. No reemplaza a un contador." />
      <PhaseNotice phase={6}>Ya ves los salarios y contratos reales de cada empleado. Falta: cargar los parámetros legales verificados y calcular la estimación por período.</PhaseNotice>

      {p.parametersLoaded === 0 && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-medium text-fg">Faltan los parámetros laborales vigentes</p>
            <p className="mt-0.5 text-fg-muted">
              No hay valores cargados de salario mínimo, auxilio de transporte, recargos ni horas extra. Nexora no calcula con porcentajes
              supuestos: cada valor se carga con su norma y fecha de vigencia, y lo revisa un profesional de nómina.
            </p>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Condiciones vigentes</CardTitle>
          <span className="tabular text-sm text-fg-muted">Salarios básicos: {formatCOP(total)} / mes</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm whitespace-nowrap">
            <thead>
              <tr className="border-y border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                <th className="px-5 py-2 font-medium">Empleado</th>
                <th className="px-5 py-2 font-medium">Contrato</th>
                <th className="px-5 py-2 text-right font-medium">Salario mensual</th>
                <th className="px-5 py-2 text-right font-medium">Horas/sem.</th>
                <th className="px-5 py-2 font-medium">Pago</th>
                <th className="px-5 py-2 font-medium">ARL</th>
                <th className="px-5 py-2 text-right font-medium">Estimado del período</th>
              </tr>
            </thead>
            <tbody>
              {p.employees.map((e) => {
                const c = e.contracts[0];
                return (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3"><p className="font-medium">{e.firstName} {e.lastName}</p><p className="text-xs text-fg-subtle">{e.position}</p></td>
                    <td className="px-5 py-3 text-fg-muted">{c ? contractTypeLabel[c.contractType] : "Sin contrato vigente"}</td>
                    <td className="tabular px-5 py-3 text-right">{c ? formatCOP(Number(c.monthlySalary)) : "—"}</td>
                    <td className="tabular px-5 py-3 text-right">{c ? Number(c.weeklyHours) : "—"}</td>
                    <td className="px-5 py-3 text-fg-muted">{c ? payFrequencyLabel[c.payFrequency] : "—"}</td>
                    <td className="px-5 py-3 text-fg-muted">{c ? `Clase ${c.arlRiskClass}` : "—"}</td>
                    <td className="px-5 py-3 text-right text-xs text-warning">Pendiente de parámetros</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <p className="text-sm font-medium">Qué incluirá la estimación</p>
        <ul className="mt-2 grid gap-1 text-sm text-fg-muted sm:grid-cols-2">
          {concepts.map((c) => <li key={c}>• {c}</li>)}
        </ul>
      </Card>
    </>
  );
}
