import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, BarChart3, Building2, CalendarClock, CalendarX2, Clock, QrCode, UserCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { auditActionLabel } from "@/lib/labels";
import { formatDate, formatMinutes, formatTime } from "@/lib/utils";
import { attendanceDay } from "@/server/attendance";
import { recentAudit } from "@/server/company";
import { requireActor } from "@/server/current";
import { needsOnboarding } from "@/server/onboarding";
import { adminOverview } from "@/server/overview";

export const metadata: Metadata = { title: "Resumen" };

export default async function AdminHome() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  // Empresa recién creada: primero la configuración inicial (sede, turnos, empleados, horarios).
  if (await needsOnboarding(actor)) redirect("/admin/bienvenida");
  const [o, activity, day] = await Promise.all([adminOverview(actor), recentAudit(actor, 8), attendanceDay(actor)]);
  const today = new Date(`${o.today}T12:00:00Z`);

  return (
    <>
      <PageHeader title="Resumen" description={`Hoy, ${formatDate(today, "UTC")}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Empleados activos" value={String(o.activeEmployees)} icon={Users} />
        <StatCard label="Programados hoy" value={`${o.scheduledToday} / ${o.activeEmployees}`} icon={CalendarClock} footnote="según sus horarios" />
        <StatCard label="Sedes activas" value={String(o.activeSites)} icon={Building2} />
        <StatCard label="QR vigentes" value={String(o.qrActive)} icon={QrCode} footnote={o.qrActive < o.activeSites ? "faltan QR por generar" : "uno por sede"} />
      </div>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Asistencia de hoy{day.holiday ? ` · festivo: ${day.holiday.name}` : ""}</h2>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/asistencia" className="text-primary hover:underline">Ver detalle</Link>
          <Link href="/admin/reportes" className="inline-flex items-center gap-1 text-primary hover:underline"><BarChart3 className="size-4" aria-hidden /> Reportes</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="En jornada ahora" value={String(day.present)} icon={UserCheck} footnote={`de ${o.scheduledToday} programados hoy`} />
        <StatCard label="Llegadas tarde" value={String(day.late)} icon={AlarmClock} footnote="después de la tolerancia" />
        <StatCard label="Ausentes" value={String(day.absent)} icon={CalendarX2} footnote="con turno y sin marcar" />
        <StatCard label="Horas trabajadas hoy" value={formatMinutes(day.workedMinutes)} icon={Clock} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle>Turnos de hoy</CardTitle>
            <Link href="/admin/empleados" className="text-sm text-primary hover:underline">Ver empleados</Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm whitespace-nowrap">
              <thead>
                <tr className="border-y border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  <th className="px-5 py-2 font-medium">Empleado</th>
                  <th className="px-5 py-2 font-medium">Sede</th>
                  <th className="px-5 py-2 font-medium">Turno</th>
                </tr>
              </thead>
              <tbody>
                {o.roster.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${r.firstName} ${r.lastName}`} className="size-7" />
                        <div>
                          <p className="font-medium text-fg">{r.firstName} {r.lastName}</p>
                          <p className="text-xs text-fg-subtle">{r.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-fg-muted">{r.shifts[0]?.siteName ?? r.defaultSite?.name ?? "—"}</td>
                    <td className="tabular px-5 py-3">
                      {r.shifts.length === 0 ? (
                        <Badge>Descanso</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.shifts.map((s) => (
                            <Badge key={s.start.toISOString()} tone={s.endMin > 1440 ? "accent" : "primary"}>
                              {formatTime(s.start, o.timezone)} – {formatTime(s.end, o.timezone)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {o.roster.length === 0 && <EmptyState icon={Users} title="Aún no hay empleados activos" />}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <Link href="/admin/configuracion#actividad" className="text-sm text-primary hover:underline">Ver más</Link>
          </CardHeader>
          <ul className="grid gap-3 p-5 pt-4 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-col">
                <span className="text-fg">{auditActionLabel[a.action] ?? a.action}</span>
                <span className="text-xs text-fg-subtle">
                  {a.actor?.name ?? "Sistema"} · {formatTime(a.occurredAt, o.timezone)}, {formatDate(a.occurredAt, o.timezone)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
