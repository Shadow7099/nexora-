import type { Metadata } from "next";
import { Clock, LogIn, ShieldAlert, Timer, UserX } from "lucide-react";
import { DeviceActions } from "@/components/admin/device-actions";
import { PageHeader } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatMinutes, formatTime } from "@/lib/utils";
import { attendanceDay, type DayStatus } from "@/server/attendance";
import { requireActor } from "@/server/current";
import { listDevices } from "@/server/devices";

export const metadata: Metadata = { title: "Asistencia" };

const statusBadge: Record<DayStatus, React.ReactNode> = {
  working: <Badge tone="success" dot>En jornada</Badge>,
  done: <Badge tone="primary">Jornada terminada</Badge>,
  late: <Badge tone="warning" dot>Llegó tarde</Badge>,
  absent: <Badge tone="danger" dot>Sin marcar</Badge>,
  upcoming: <Badge>Turno más tarde</Badge>,
  rest: <Badge>Descanso</Badge>,
  review: <Badge tone="accent">Revisar: sin salida</Badge>,
  novelty: <Badge tone="primary">Novedad</Badge>,
};

export default async function AttendancePage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const [d, devices] = await Promise.all([attendanceDay(actor), listDevices(actor)]);
  const pending = devices.filter((x) => x.status === "PENDING");
  const tz = d.timezone;

  return (
    <>
      <PageHeader title="Asistencia" description={`Hoy, ${formatDate(new Date(`${d.today}T12:00:00Z`), "UTC")}${d.holiday ? ` · Festivo: ${d.holiday.name}` : ""} · se actualiza al recargar`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="En jornada ahora" value={`${d.present} / ${d.rows.length}`} icon={LogIn} />
        <StatCard label="Llegadas tarde hoy" value={String(d.late)} icon={Clock} />
        <StatCard label="Sin marcar" value={String(d.absent)} icon={UserX} footnote="turno ya iniciado" />
        <StatCard label="Horas registradas hoy" value={formatMinutes(d.workedMinutes)} icon={Timer} />
      </div>

      {pending.length > 0 && (
        <Card className="mt-6 border-warning/40">
          <CardHeader className="pb-3">
            <div>
              <CardTitle>Celulares por aprobar</CardTitle>
              <CardDescription>Al aprobar uno nuevo, el celular anterior del empleado queda desvinculado.</CardDescription>
            </div>
          </CardHeader>
          <ul className="divide-y divide-border">
            {pending.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{x.employee.firstName} {x.employee.lastName}</p>
                  <p className="text-xs text-fg-subtle">{x.label} · solicitado {formatTime(x.createdAt, tz)}, {formatDate(x.createdAt, tz)}</p>
                </div>
                <DeviceActions id={x.id} pending />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="pb-4"><CardTitle>Empleados hoy</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm whitespace-nowrap">
            <thead>
              <tr className="border-y border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                <th className="px-5 py-2 font-medium">Empleado</th>
                <th className="px-5 py-2 font-medium">Estado</th>
                <th className="px-5 py-2 font-medium">Turno</th>
                <th className="px-5 py-2 font-medium">Entrada</th>
                <th className="px-5 py-2 font-medium">Salida</th>
                <th className="px-5 py-2 text-right font-medium">Horas</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${r.firstName} ${r.lastName}`} className="size-7" />
                      <div>
                        <p className="font-medium">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-fg-subtle">{r.siteName ?? r.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {statusBadge[r.status]}
                      {r.status === "late" && <span className="text-xs text-warning">+{r.lateMinutes} min</span>}
                      {r.novelty && <span className="text-xs text-fg-muted">{r.novelty}</span>}
                      {r.flagged && <Badge tone="accent">Revisar ubicación</Badge>}
                    </div>
                  </td>
                  <td className="tabular px-5 py-3 text-fg-muted">{r.shift ? `${formatTime(r.shift.start, tz)} – ${formatTime(r.shift.end, tz)}` : "—"}</td>
                  <td className="tabular px-5 py-3">{r.firstIn ? formatTime(r.firstIn, tz) : "—"}</td>
                  <td className="tabular px-5 py-3">{r.lastOut ? formatTime(r.lastOut, tz) : r.working ? "en curso" : "—"}</td>
                  <td className="tabular px-5 py-3 text-right">{r.workedMinutes ? formatMinutes(r.workedMinutes) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="pb-4">
          <div>
            <CardTitle>Intentos rechazados (últimos 7 días)</CardTitle>
            <CardDescription>Marcaciones que no se registraron y por qué. Sirven para detectar errores o abusos.</CardDescription>
          </div>
        </CardHeader>
        {d.attempts.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Sin intentos rechazados" />
        ) : (
          <ul className="divide-y divide-border">
            {d.attempts.map((a) => {
              const detail = (a.detail ?? {}) as { distance?: number; accuracy?: number };
              return (
                <li key={a.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{a.userName}</span>
                    <span className="tabular text-xs text-fg-subtle">{formatTime(a.occurredAt, tz)}, {formatDate(a.occurredAt, tz)}</span>
                  </div>
                  <p className="mt-0.5 text-fg-muted">
                    {a.message}
                    {a.siteName !== "—" && ` · ${a.siteName}`}
                    {detail.distance != null && ` · a ${detail.distance} m`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
