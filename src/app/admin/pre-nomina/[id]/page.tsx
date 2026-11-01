import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatParamValue, parameterLabel } from "@/lib/labor-parameter-info";
import { cn, formatCOP, formatMinutes } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { getPayrollEstimate } from "@/server/payroll";

export const metadata: Metadata = { title: "Detalle de pre-nómina" };

const KIND_TITLE: Record<string, string> = {
  DEVENGADO: "Devengado",
  DEDUCCION: "Deducciones del trabajador",
  APORTE_EMPLEADOR: "Aportes del empleador",
  PROVISION: "Provisiones de prestaciones sociales",
};
const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const d = (iso: string) => fmt.format(new Date(`${iso}T12:00:00Z`));
const sumRec = (r: unknown) => Object.values((r ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0);

export default async function EstimatePage({ params }: PageProps<"/admin/pre-nomina/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  let e: Awaited<ReturnType<typeof getPayrollEstimate>>;
  try {
    e = await getPayrollEstimate(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const blocked = e.warnings.some((w) => w.severity === "block");
  const m = e.snapshot.minutes as Record<string, unknown>;
  const back = `/admin/pre-nomina?inicio=${e.period.start}&fin=${e.period.end}`;
  const kinds = ["DEVENGADO", "DEDUCCION", "APORTE_EMPLEADOR", "PROVISION"] as const;

  return (
    <>
      <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Volver a la pre-nómina</Link>
      <PageHeader
        title={`${e.employee.firstName} ${e.employee.lastName}`}
        description={`${e.employee.position} · período del ${d(e.period.start)} al ${d(e.period.end)} · estimación, no liquidación legal`}
      />

      {e.warnings.length > 0 && (
        <div className="mb-6 grid gap-2">
          {e.warnings.map((w) => {
            const Icon = w.severity === "block" ? OctagonAlert : w.severity === "warn" ? TriangleAlert : Info;
            return (
              <div
                key={w.code}
                role={w.severity === "block" ? "alert" : "note"}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                  w.severity === "block" ? "border-danger/30 bg-danger-soft" : w.severity === "warn" ? "border-warning/30 bg-warning-soft" : "border-border bg-bg-subtle",
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", w.severity === "block" ? "text-danger" : w.severity === "warn" ? "text-warning" : "text-fg-subtle")} aria-hidden />
                <p className="text-fg">{w.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {!blocked && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Devengado", e.gross],
              ["Deducciones", e.deductions],
              ["Neto estimado", e.net],
              ["Costo empresa", e.employerCost],
            ].map(([k, v]) => (
              <Card key={k as string} className="p-4">
                <p className="text-xs text-fg-subtle">{k}</p>
                <p className="tabular mt-1 text-lg font-semibold">{formatCOP(v as number)}</p>
              </Card>
            ))}
          </div>

          <Card className="mb-6 p-5">
            <p className="text-sm font-medium">Tiempo considerado</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              {[
                ["Días pagados", `${e.snapshot.paidDays}`],
                ["Ordinario diurno", formatMinutes(Number(m.ordinaryDay ?? 0))],
                ["Ordinario nocturno", formatMinutes(Number(m.ordinaryNight ?? 0))],
                ["Domingo/festivo", formatMinutes(sumRec(m.ordinaryHolidayDay) + sumRec(m.ordinaryHolidayNight))],
                ["Extra aprobada", formatMinutes(Number(m.extraDay ?? 0) + Number(m.extraNight ?? 0) + sumRec(m.extraHolidayDay) + sumRec(m.extraHolidayNight))],
                ["Extra no aprobada", formatMinutes(Number(m.notApproved ?? 0))],
                ["Descanso no pagado", formatMinutes(Number(m.unpaidBreak ?? 0))],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-fg-subtle">{k}</dt>
                  <dd className="tabular">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {kinds.map((k) => {
            const lines = e.lines.filter((l) => l.kind === k);
            if (lines.length === 0) return null;
            return (
              <Card key={k} className="mb-6 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle>{KIND_TITLE[k]}</CardTitle>
                  <span className="tabular text-sm font-medium">{formatCOP(lines.reduce((a, l) => a + l.amount, 0))}</span>
                </CardHeader>
                <ul className="divide-y divide-border border-t border-border">
                  {lines.map((l) => (
                    <li key={l.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{l.label}</p>
                        <p className="text-xs break-words text-fg-muted">{l.basis}</p>
                      </div>
                      <p className="tabular text-right font-medium">{formatCOP(l.amount)}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Parámetros usados en este cálculo</CardTitle>
          <Link href="/admin/pre-nomina/parametros" className={buttonVariants({ variant: "ghost", size: "sm" })}>Ver tabla completa</Link>
        </CardHeader>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[640px] text-sm">
            <tbody>
              {e.snapshot.parameters.map((p) => (
                <tr key={`${p.key}-${p.validFrom}`} className="border-b border-border last:border-0">
                  <td className="px-5 py-2">{parameterLabel(p.key)}</td>
                  <td className="tabular px-5 py-2 text-right whitespace-nowrap">{formatParamValue(p.unit, p.value)}</td>
                  <td className="px-5 py-2 text-xs text-fg-muted">{p.legalSource}</td>
                  <td className="px-5 py-2 whitespace-nowrap">{p.verifiedAt ? <Badge tone="success" dot>Validado</Badge> : <Badge tone="warning">Sin validar</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
