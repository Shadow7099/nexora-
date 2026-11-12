import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Banknote, Check, ChevronLeft, ChevronRight, ChevronRight as Go, FileDown, FileSpreadsheet, HandCoins, History, Info, Landmark, Lock, PiggyBank, Scale, TriangleAlert, Wallet } from "lucide-react";
import { ComputePayrollButton, PayrollStatusControls } from "@/components/admin/payroll-controls";
import { PageHeader } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { addIsoDays, periodFor, periodFrequency } from "@/lib/payroll";
import { cn, formatCOP } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { defaultPeriod, listLaborParameters, payrollConceptTotals, payrollOverview, payrollTimeline, STATUS_LABEL } from "@/server/payroll";

export const metadata: Metadata = { title: "Pre-nómina" };

const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const label = (iso: string) => fmt.format(new Date(`${iso}T12:00:00Z`));
const href = (p: { start: string; end: string }) => `/admin/pre-nomina?inicio=${p.start}&fin=${p.end}`;
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const when = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const STATUS_TONE = { DRAFT: "neutral", REVIEWED: "warning", CLOSED: "success" } as const;
const KIND_LABEL: Record<string, string> = { DEVENGADO: "Devengado", DEDUCCION: "Deducción", APORTE_EMPLEADOR: "Aporte empleador", PROVISION: "Provisión" };
const STEPS = [
  { key: "DRAFT", label: "Calcular" },
  { key: "REVIEWED", label: "Revisar" },
  { key: "CLOSED", label: "Cerrar" },
] as const;

export default async function PayrollPage({ searchParams }: PageProps<"/admin/pre-nomina">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { inicio, fin } = await searchParams;
  const asked = typeof inicio === "string" && typeof fin === "string" && periodFrequency(inicio, fin) ? { start: inicio, end: fin } : defaultPeriod();
  const [o, params] = await Promise.all([payrollOverview(actor, asked), listLaborParameters(actor)]);
  const freq = o.frequency;
  const prev = periodFor(addIsoDays(o.start, -1), freq);
  const next = periodFor(addIsoDays(o.end, 1), freq);
  const toggle = freq === "QUINCENAL" ? periodFor(o.start, "MENSUAL") : periodFor(o.start, "QUINCENAL");
  const unverified = params.filter((p) => p.companyId === null && p.verifiedAt === null).length;
  const [timeline, concepts] = o.period ? await Promise.all([payrollTimeline(actor, o.period.id), payrollConceptTotals(actor, o.period.id)]) : [[], null];
  const status = o.period?.status ?? null;
  const stepIndex = status === "CLOSED" ? 3 : status === "REVIEWED" ? 2 : status === "DRAFT" && o.estimates.length > 0 ? 1 : 0;
  const okCount = o.estimates.length - o.blockedCount;

  return (
    <>
      <PageHeader
        title="Pre-nómina"
        description="Estimación, no liquidación legal. No reemplaza a un contador."
        actions={
          <>
            <Link href="/admin/pre-nomina/parametros" className={buttonVariants({ variant: "secondary" })}><Scale aria-hidden /> Parámetros laborales</Link>
          </>
        }
      />

      {unverified > 0 && (
        <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-medium text-fg">{unverified} parámetro(s) legales aún sin validar por un contador</p>
            <p className="mt-0.5 text-fg-muted">
              Cada valor cita su norma y fecha de vigencia, pero hasta que un profesional de nómina los valide, toma los resultados como una
              referencia. <Link href="/admin/pre-nomina/parametros" className="font-medium text-primary underline-offset-2 hover:underline">Ver la tabla de parámetros</Link>
            </p>
          </div>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="flex-wrap gap-4">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {freq === "QUINCENAL" ? "Quincena" : "Mes"} del {label(o.start)} al {label(o.end)}
              {status && <Badge tone={STATUS_TONE[status]} dot>{STATUS_LABEL[status]}</Badge>}
            </CardTitle>
            <CardDescription>
              {o.period ? <>Calculada el {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(o.estimates[0]?.computedAt ?? o.period.createdAt)}</> : "Aún no se ha calculado"}
              {" · "}Exoneración art. 114-1: <span className="font-medium text-fg">{o.parafiscalExempt ? "sí aplica" : "no aplica"}</span>{" "}
              (<Link href="/admin/configuracion" className="text-primary underline-offset-2 hover:underline">cambiar</Link>)
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Link href={href(prev)} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Período anterior"><ChevronLeft /></Link>
            <Link href={href(toggle)} className={buttonVariants({ variant: "secondary" })}>{freq === "QUINCENAL" ? "Ver mes" : "Ver quincena"}</Link>
            <Link href={href(next)} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Período siguiente"><ChevronRight /></Link>
          </div>
        </CardHeader>
        <div className="grid gap-5 px-5 pb-5">
          <ol className="grid grid-cols-3 gap-2" aria-label="Pasos para liquidar el período">
            {STEPS.map((st, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={st.key} aria-current={current ? "step" : undefined} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", done ? "border-success/30 bg-success-soft text-fg" : current ? "border-primary/40 bg-primary-soft text-fg" : "border-border text-fg-subtle")}>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold", done ? "bg-success text-white" : current ? "bg-primary text-primary-fg" : "bg-bg-subtle")}>
                    {done ? <Check className="size-3" aria-hidden /> : i + 1}
                  </span>
                  <span className="truncate">{st.label}</span>
                  {done && <span className="sr-only">(hecho)</span>}
                </li>
              );
            })}
          </ol>

          {status === "CLOSED" ? (
            <div role="note" className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <p className="text-fg">
                Período cerrado{timeline.find((t) => t.action === "payroll.close") ? <> el {when.format(timeline.find((t) => t.action === "payroll.close")!.at)} por {timeline.find((t) => t.action === "payroll.close")!.by}</> : null}.
                {" "}<span className="text-fg-muted">Los valores quedan fijos: no se recalcula aunque cambien jornadas o novedades.</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-start gap-3">
              {(!status || status === "DRAFT") && <ComputePayrollButton start={o.start} end={o.end} computed={!!o.period} />}
              {o.period && o.estimates.length > 0 && <PayrollStatusControls periodId={o.period.id} status={o.period.status} canReview={o.blockedCount === 0} />}
            </div>
          )}

          {o.period && okCount > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <a href={`/admin/pre-nomina/comprobantes/${o.period.id}`} className={buttonVariants({ variant: "secondary" })} download>
                <FileDown aria-hidden /> Comprobantes de pago (PDF){status !== "CLOSED" && " · borrador"}
              </a>
              <a href={`/admin/reportes/descargar/pre-nomina?formato=xlsx&desde=${o.start}&hasta=${o.end}`} className={buttonVariants({ variant: "secondary" })} download>
                <FileSpreadsheet aria-hidden /> Resumen para el contador (Excel)
              </a>
            </div>
          )}
        </div>
      </Card>

      {!o.period || o.estimates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Sin estimación para este período"
            description="Calcula la estimación: usa las jornadas cerradas, las horas extra aprobadas, las novedades aprobadas y los parámetros legales vigentes en cada fecha."
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Devengado" value={formatCOP(o.totals.gross)} icon={Banknote} />
            <StatCard label="Deducciones del trabajador" value={formatCOP(o.totals.deductions)} icon={HandCoins} />
            <StatCard label="Neto estimado a pagar" value={formatCOP(o.totals.net)} icon={Wallet} />
            <StatCard label="Costo total para la empresa" value={formatCOP(o.totals.employerCost)} icon={BadgeCheck} footnote="Incluye aportes y provisiones" />
          </div>

          {o.blockedCount > 0 && (
            <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              <p className="text-fg">
                <span className="font-medium">{o.blockedCount} empleado(s) sin calcular.</span>{" "}
                <span className="text-fg-muted">Faltan datos o parámetros; no se muestra ningún valor para ellos ni se suman a los totales.</span>
              </p>
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                    <th className="px-5 py-2 font-medium">Empleado</th>
                    <th className="px-5 py-2 text-right font-medium">Devengado</th>
                    <th className="px-5 py-2 text-right font-medium">Deducciones</th>
                    <th className="px-5 py-2 text-right font-medium">Neto</th>
                    <th className="px-5 py-2 text-right font-medium">Costo empresa</th>
                    <th className="px-5 py-2 font-medium">Advertencias</th>
                    <th className="px-2 py-2"><span className="sr-only">Detalle</span></th>
                  </tr>
                </thead>
                <tbody>
                  {o.estimates.map((e) => {
                    const warn = e.warnings.filter((w) => w.severity === "warn").length;
                    const money = (n: number) => (e.blocked ? <span className="text-fg-subtle">—</span> : formatCOP(n));
                    return (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-bg-subtle/40">
                        <td className="px-5 py-3">
                          <Link href={`/admin/pre-nomina/${e.id}`} className="flex items-center gap-2 hover:underline">
                            <Avatar name={`${e.employee.firstName} ${e.employee.lastName}`} className="size-7" />
                            <span>
                              <span className="block font-medium">{e.employee.firstName} {e.employee.lastName}</span>
                              <span className="block text-xs text-fg-subtle">{e.employee.position}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="tabular px-5 py-3 text-right">{money(e.gross)}</td>
                        <td className="tabular px-5 py-3 text-right">{money(e.deductions)}</td>
                        <td className="tabular px-5 py-3 text-right font-medium">{money(e.net)}</td>
                        <td className="tabular px-5 py-3 text-right">{money(e.employerCost)}</td>
                        <td className="px-5 py-3">
                          {e.blocked ? <Badge tone="danger">Sin calcular</Badge> : warn > 0 ? <Badge tone="warning">{warn} por revisar</Badge> : <Badge tone="success" dot>Sin alertas</Badge>}
                        </td>
                        <td className="px-2 py-3">
                          <Link href={`/admin/pre-nomina/${e.id}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))} aria-label={`Ver detalle de ${e.employee.firstName}`}><Go /></Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {concepts && okCount > 0 && (
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="pb-3">
            <div>
              <CardTitle>Liquidación del período</CardTitle>
              <CardDescription>Cuánto sale y a quién, sumando los {okCount} empleado(s) calculados.</CardDescription>
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
            {[
              { k: "Neto a pagar a empleados", v: concepts.payNet, icon: Wallet, note: "Transferencias o efectivo" },
              { k: "Planilla de seguridad social", v: concepts.paySocialSecurity, icon: Landmark, note: "PILA: salud, pensión, ARL y parafiscales (incluye lo descontado al trabajador)" },
              { k: "Provisiones para reservar", v: concepts.provisions, icon: PiggyBank, note: "Cesantías, intereses, prima y vacaciones: se pagan en sus fechas" },
            ].map(({ k, v, icon: Icon, note }) => (
              <div key={k} className="rounded-xl border border-border p-4">
                <p className="flex items-center gap-2 text-xs text-fg-subtle"><Icon className="size-4" aria-hidden /> {k}</p>
                <p className="tabular mt-1 text-lg font-semibold">{formatCOP(v)}</p>
                <p className="mt-1 text-xs text-fg-muted">{note}</p>
              </div>
            ))}
          </div>
          <div className="relative overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  <th className="px-5 py-2 font-medium">Concepto</th>
                  <th className="hidden px-5 py-2 font-medium sm:table-cell">Tipo</th>
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {concepts.rows.map((r) => (
                  <tr key={`${r.kind}-${r.concept}`} className="border-b border-border last:border-0">
                    <td className="px-5 py-2">
                      {r.label}
                      <span className="block text-xs text-fg-subtle sm:hidden">{KIND_LABEL[r.kind] ?? r.kind}</span>
                    </td>
                    <td className="hidden px-5 py-2 text-fg-muted sm:table-cell">{KIND_LABEL[r.kind] ?? r.kind}</td>
                    <td className="tabular px-5 py-2 text-right">{formatCOP(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {o.periods.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><History className="size-4 text-fg-subtle" aria-hidden /> Períodos calculados</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border border-t border-border">
            {o.periods.map((p) => {
              const ps = { start: isoOf(p.startDate), end: isoOf(p.endDate) };
              const current = ps.start === o.start && ps.end === o.end;
              return (
                <li key={p.id}>
                  <Link href={href(ps)} aria-current={current ? "page" : undefined} className={cn("flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-bg-subtle/40", current && "bg-primary-soft/50")}>
                    <span className="min-w-0">
                      <span className="block font-medium">{p.frequency === "QUINCENAL" ? "Quincena" : "Mes"} del {label(ps.start)} al {label(ps.end)}</span>
                      <span className="block text-xs text-fg-subtle">{p._count.estimates} empleado(s)</span>
                    </span>
                    <Badge tone={STATUS_TONE[p.status]} dot>{STATUS_LABEL[p.status]}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {timeline.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="text-sm font-medium">Historial de este período</p>
          <ul className="mt-2 grid gap-1 text-sm text-fg-muted">
            {timeline.map((t) => (
              <li key={t.id}><span className="text-fg">{t.label}</span> · {when.format(t.at)} · {t.by}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <p className="flex items-center gap-2 text-sm font-medium"><Info className="size-4 text-fg-subtle" aria-hidden /> Qué incluye y qué no</p>
        <div className="mt-2 grid gap-4 text-sm text-fg-muted sm:grid-cols-2">
          <ul className="grid gap-1">
            <li>• Salario por días (mes comercial de 30 días) y auxilio de transporte si aplica.</li>
            <li>• Recargos nocturnos, dominicales y festivos según la fecha de cada minuto trabajado.</li>
            <li>• Solo las horas extra <strong className="font-medium text-fg">aprobadas</strong>; las rechazadas o pendientes no se pagan como extra.</li>
            <li>• Salud y pensión del trabajador; aportes del empleador y provisiones de prestaciones.</li>
          </ul>
          <ul className="grid gap-1">
            <li>• No incluye retención en la fuente, embargos, libranzas ni otros descuentos.</li>
            <li>• Incapacidades y licencias se estiman como salario normal y se advierten para revisión.</li>
            <li>• ARL con la tarifa inicial de cada clase de riesgo; la de tu póliza puede variar.</li>
            <li>• Jornadas abiertas o por revisar no se incluyen hasta corregirlas.</li>
          </ul>
        </div>
      </Card>
    </>
  );
}
