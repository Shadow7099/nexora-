import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, BadgeDollarSign, Building2, CalendarCheck2, CalendarX2, Clock, Eye, FileSpreadsheet, FileText, Sheet, Timer } from "lucide-react";
import { CostChart, PunctualityChart, SiteHoursChart, WeeklyAttendanceChart } from "@/components/admin/report-charts";
import { PageHeader } from "@/components/layout/admin-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { formatIsoDate, REPORTS, type ReportKey } from "@/lib/report-table";
import { localDate } from "@/lib/schedule";
import { formatCOP, formatMinutes } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { dashboard, type ReportFilters } from "@/server/reports";
import { shiftIsoDays } from "@/server/schedule-data";

export const metadata: Metadata = { title: "Reportes" };

const qs = (f: ReportFilters, extra: Record<string, string> = {}) =>
  new URLSearchParams({ desde: f.from, hasta: f.to, ...(f.siteId ? { sede: f.siteId } : {}), ...(f.employeeId ? { empleado: f.employeeId } : {}), ...extra }).toString();

/** Variación frente al período anterior: "+12 %" / "−3" con su dirección. */
function delta(now: number | null, before: number | null, unit: "pct" | "count" | "pp") {
  if (now == null || before == null) return undefined;
  // Sin base de comparación (período anterior en cero), un porcentaje no tiene sentido.
  if (unit === "pct" && before === 0) return undefined;
  const diff = now - before;
  if (diff === 0) return undefined;
  const abs = Math.abs(diff);
  const value = unit === "pp" ? `${abs.toLocaleString("es-CO", { maximumFractionDigits: 1 })} pts` : unit === "pct" ? `${Math.round((abs / before) * 100)} %` : abs.toLocaleString("es-CO");
  return { value, direction: diff > 0 ? ("up" as const) : ("down" as const) };
}

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reportes">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const d = await dashboard(actor, await searchParams);
  const f = d.filters;
  const s = d.summary;
  const p = d.prevSummary;
  const today = localDate(new Date());
  const month = today.slice(0, 7);
  const prevMonthEnd = shiftIsoDays(`${month}-01`, -1);
  const quick = [
    { label: "Últimos 7 días", from: shiftIsoDays(today, -6), to: today },
    { label: "Últimos 30 días", from: shiftIsoDays(today, -29), to: today },
    { label: "Este mes", from: `${month}-01`, to: today },
    { label: "Mes anterior", from: `${prevMonthEnd.slice(0, 7)}-01`, to: prevMonthEnd },
  ];

  return (
    <>
      <PageHeader title="Reportes" description={`Del ${formatIsoDate(f.from)} al ${formatIsoDate(f.to)} · comparado con ${formatIsoDate(d.prevRange.from)} – ${formatIsoDate(d.prevRange.to)}`} />

      {/* Filtros: un formulario GET; la URL se puede guardar o compartir. */}
      <Card className="mb-6 p-4">
        <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]" aria-label="Filtros">
          <div className="grid gap-1.5">
            <Label htmlFor="desde">Desde</Label>
            <Input id="desde" name="desde" type="date" defaultValue={f.from} max={today} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hasta">Hasta</Label>
            <Input id="hasta" name="hasta" type="date" defaultValue={f.to} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sede">Sede</Label>
            <Select id="sede" name="sede" defaultValue={f.siteId ?? ""}>
              <option value="">Todas las sedes</option>
              {d.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="empleado">Empleado</Label>
            <Select id="empleado" name="empleado" defaultValue={f.employeeId ?? ""}>
              <option value="">Todos los empleados</option>
              {d.employees.map((x) => <option key={x.id} value={x.id}>{x.name}{x.active ? "" : " (inactivo)"}</option>)}
            </Select>
          </div>
          <button type="submit" className={buttonVariants()}>Aplicar</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {quick.map((q) => (
            <Link key={q.label} href={`/admin/reportes?${qs({ ...f, from: q.from, to: q.to })}`} className={buttonVariants({ variant: "secondary", size: "sm" })}
              aria-current={q.from === f.from && q.to === f.to ? "true" : undefined}>
              {q.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Asistencia" value={s.attendanceRate == null ? "—" : `${s.attendanceRate.toLocaleString("es-CO")} %`} icon={CalendarCheck2}
          delta={delta(s.attendanceRate, p.attendanceRate, "pp")} footnote={`${s.attendedDays} de ${s.scheduledDays} días programados`} />
        <StatCard label="Puntualidad" value={s.punctuality == null ? "—" : `${s.punctuality.toLocaleString("es-CO")} %`} icon={AlarmClock}
          delta={delta(s.punctuality, p.punctuality, "pp")} footnote={`${s.lates} llegada(s) tarde`} />
        <StatCard label="Ausencias" value={String(s.absences)} icon={CalendarX2} goodWhen="down" delta={delta(s.absences, p.absences, "count")}
          footnote={s.toReview ? `${s.toReview} jornada(s) por revisar` : "sin novedad que las cubra"} />
        <StatCard label="Horas trabajadas" value={formatMinutes(s.workedMinutes)} icon={Clock} delta={delta(s.workedMinutes, p.workedMinutes, "pct")}
          footnote={`programadas: ${formatMinutes(s.scheduledMinutes)}`} />
        <StatCard label="Horas extra aprobadas" value={formatMinutes(d.overtimeMinutes)} icon={Timer} goodWhen="down" delta={delta(d.overtimeMinutes, d.prevOvertimeMinutes, "pct")} />
        <StatCard label="Costo estimado" value={d.cost ? formatCOP(d.cost.total) : "—"} icon={BadgeDollarSign}
          footnote={d.cost ? `${d.cost.periods} período(s) de pre-nómina dentro de las fechas` : "calcula la pre-nómina de períodos dentro de estas fechas"} />
        <StatCard label="Sedes activas" value={String(d.activeSites)} icon={Building2} />
        <StatCard label="Días con novedad" value={String(s.noveltyDays)} icon={CalendarCheck2} footnote="vacaciones, incapacidades, licencias" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyAttendanceChart data={d.weekly} />
        <PunctualityChart data={d.punctuality} />
        <SiteHoursChart data={d.bySite} />
        <CostChart data={d.costSeries} />
      </div>

      <h2 className="mb-3 text-base font-semibold">Descargar reportes</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(Object.keys(REPORTS) as ReportKey[]).map((k) => (
          <Card key={k} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{REPORTS[k].title}</p>
              <FileSpreadsheet className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            </div>
            <p className="mt-1 flex-1 text-sm text-fg-muted">{REPORTS[k].description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/admin/reportes/${k}?${qs(f)}`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Eye aria-hidden /> Ver</Link>
              <a href={`/admin/reportes/descargar/${k}?${qs(f, { formato: "xlsx" })}`} className={buttonVariants({ variant: "secondary", size: "sm" })} aria-label={`${REPORTS[k].title} en Excel`}><Sheet aria-hidden /> Excel</a>
              <a href={`/admin/reportes/descargar/${k}?${qs(f, { formato: "csv" })}`} className={buttonVariants({ variant: "secondary", size: "sm" })} aria-label={`${REPORTS[k].title} en CSV`}>CSV</a>
              <a href={`/admin/reportes/descargar/${k}?${qs(f, { formato: "pdf" })}`} className={buttonVariants({ variant: "secondary", size: "sm" })} aria-label={`${REPORTS[k].title} en PDF`}><FileText aria-hidden /> PDF</a>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
