"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

/**
 * Gráficos del tablero (fase 7). Paleta validada (--chart-1/--chart-2, claro y
 * oscuro), un solo eje, barras delgadas con extremos redondeados, cuadrícula
 * discreta, tooltip al pasar el cursor y una tabla con los mismos datos
 * (accesible para lectores de pantalla y para quien no distingue colores).
 */

const AXIS = { fontSize: 11, fill: "var(--fg-subtle)" } as const;
const fmtNum = (n: number) => n.toLocaleString("es-CO");
const fmtCOP = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
const fmtShortCOP = (n: number) => (n >= 1_000_000 ? `$ ${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M` : fmtCOP(n));
const fmtDay = (iso: string) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
const fmtMonth = (ym: string) => `${new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`)).replace(".", "")} ${ym.slice(0, 4)}`;

/** Dato del punto bajo el cursor (Recharts entrega el objeto original en payload[0].payload). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const point = <T,>(payload: readonly { payload?: unknown }[] | undefined) => (payload?.[0]?.payload as T | undefined) ?? null;

function TooltipBox({ title, items }: { title: string; items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-fg">{title}</p>
      {items.map((i) => (
        <p key={i.label} className="flex items-center gap-2 text-fg-muted">
          {i.color && <span className="size-2 rounded-sm" style={{ background: i.color }} aria-hidden />}
          <span>{i.label}:</span>
          <span className="tabular font-medium text-fg">{i.value}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, description, children, table, empty }: { title: string; description: string; children: React.ReactNode; table: React.ReactNode; empty: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      {empty ? (
        <EmptyState icon={BarChart3} title="Sin datos en este período" className="py-10" />
      ) : (
        <>
          <div className="h-60 px-2 pb-2" aria-hidden>
            {children}
          </div>
          <details className="border-t border-border px-5 py-2 text-xs text-fg-muted">
            <summary className="cursor-pointer select-none py-1">Ver datos en tabla</summary>
            <div className="mt-2 overflow-x-auto">{table}</div>
          </details>
        </>
      )}
    </Card>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-fg-subtle">{head.map((h, i) => <th key={h} className={i ? "py-1 text-right font-medium" : "py-1 font-medium"}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r[0])} className="border-t border-border">
            {r.map((c, i) => <td key={i} className={i ? "tabular py-1 text-right" : "py-1"}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WeeklyAttendanceChart({ data }: { data: { week: string; scheduled: number; attended: number; absences: number; lates: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: `Sem. ${fmtDay(d.week)}` }));
  return (
    <ChartCard
      title="Asistencia por semana"
      description="Días con asistencia y ausencias, por semana (lunes a domingo)."
      empty={data.every((d) => d.scheduled === 0 && d.attended === 0)}
      table={<SimpleTable head={["Semana", "Programados", "Asistieron", "Ausencias", "Tardanzas"]} rows={rows.map((d) => [d.label, d.scheduled, d.attended, d.absences, d.lates])} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            cursor={{ fill: "var(--bg-subtle)" }}
            content={({ active, payload }) => {
              const d = active ? point<Row>(payload) : null;
              return d ? (
                <TooltipBox
                  title={`Semana del ${fmtDay(d.week)}`}
                  items={[
                    { label: "Asistieron", value: fmtNum(d.attended), color: "var(--chart-1)" },
                    { label: "Ausencias", value: fmtNum(d.absences), color: "var(--chart-2)" },
                    { label: "Tardanzas", value: fmtNum(d.lates) },
                    { label: "Días programados", value: fmtNum(d.scheduled) },
                  ]}
                />
              ) : null;
            }}
          />
          <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12, color: "var(--fg-muted)" }} />
          <Bar dataKey="attended" name="Asistieron" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="absences" name="Ausencias" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PunctualityChart({ data }: { data: { month: string; punctuality: number | null }[] }) {
  const rows = data.filter((d) => d.punctuality != null).map((d) => ({ ...d, label: fmtMonth(d.month) }));
  return (
    <ChartCard
      title="Puntualidad por mes"
      description="% de días trabajados en que la entrada fue a tiempo (con la tolerancia de la empresa)."
      empty={rows.length === 0}
      table={<SimpleTable head={["Mes", "Puntualidad"]} rows={rows.map((d) => [d.label, `${fmtNum(d.punctuality!)} %`])} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="40%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}\u00a0%`} tick={AXIS} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            cursor={{ fill: "var(--bg-subtle)" }}
            content={({ active, payload }) => {
              const d = active ? point<Row>(payload) : null;
              return d ? <TooltipBox title={d.label} items={[{ label: "Puntualidad", value: `${fmtNum(d.punctuality)} %`, color: "var(--chart-1)" }]} /> : null;
            }}
          />
          <Bar dataKey="punctuality" name="Puntualidad" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SiteHoursChart({ data }: { data: { site: string; hours: number }[] }) {
  return (
    <ChartCard
      title="Horas trabajadas por sede"
      description="Horas de jornadas cerradas, según la sede de entrada."
      empty={data.length === 0}
      table={<SimpleTable head={["Sede", "Horas"]} rows={data.map((d) => [d.site, fmtNum(d.hours)])} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} h`} />
          <YAxis type="category" dataKey="site" tick={AXIS} tickLine={false} axisLine={false} width={110} />
          <Tooltip
            cursor={{ fill: "var(--bg-subtle)" }}
            content={({ active, payload }) => {
              const d = active ? point<Row>(payload) : null;
              return d ? <TooltipBox title={d.site} items={[{ label: "Horas", value: fmtNum(d.hours), color: "var(--chart-1)" }]} /> : null;
            }}
          />
          <Bar dataKey="hours" name="Horas" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CostChart({ data }: { data: { start: string; end: string; cost: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: `${fmtDay(d.start)}–${fmtDay(d.end)}` }));
  return (
    <ChartCard
      title="Costo estimado por período de nómina"
      description="Costo total para la empresa de cada pre-nómina calculada (últimos 12 períodos)."
      empty={rows.length === 0}
      table={<SimpleTable head={["Período", "Costo estimado"]} rows={rows.map((d) => [d.label, fmtCOP(d.cost)])} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval="preserveStartEnd" />
          <YAxis tickFormatter={fmtShortCOP} tick={AXIS} tickLine={false} axisLine={false} width={64} />
          <Tooltip
            cursor={{ fill: "var(--bg-subtle)" }}
            content={({ active, payload }) => {
              const d = active ? point<Row>(payload) : null;
              return d ? <TooltipBox title={`Período ${d.label}`} items={[{ label: "Costo estimado", value: fmtCOP(d.cost), color: "var(--chart-1)" }]} /> : null;
            }}
          />
          <Bar dataKey="cost" name="Costo estimado" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
