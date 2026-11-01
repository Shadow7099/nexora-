import type { Metadata } from "next";
import { CalendarX, ClipboardPen, Timer } from "lucide-react";
import { CloseSessionForm, ManualSessionForm, NoveltyDecision, OvertimeDecision, RegisterNovelty, ScanOvertimeButton } from "@/components/admin/request-forms";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatMinutes, formatTime } from "@/lib/utils";
import { listSessionsToReview } from "@/server/corrections";
import { requireActor } from "@/server/current";
import { listEmployees, listSiteOptions } from "@/server/employees";
import { listNovelties, noveltyLabel } from "@/server/novelties";
import { listOvertime } from "@/server/overtime";

export const metadata: Metadata = { title: "Solicitudes" };

const day = (d: Date) => new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
const status = {
  PENDING: <Badge tone="warning" dot>Pendiente</Badge>,
  APPROVED: <Badge tone="success">Aprobada</Badge>,
  REJECTED: <Badge tone="danger">Rechazada</Badge>,
  CANCELLED: <Badge>Retirada</Badge>,
};

export default async function RequestsPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const [overtime, novelties, review, employees, sites] = await Promise.all([
    listOvertime(actor), listNovelties(actor), listSessionsToReview(actor), listEmployees(actor), listSiteOptions(actor),
  ]);
  const otPending = overtime.filter((o) => o.status === "PENDING");
  const nvPending = novelties.filter((n) => n.status === "PENDING");
  const activeEmployees = employees.filter((e) => e.status === "ACTIVE").map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));

  return (
    <>
      <PageHeader title="Solicitudes" description="Decide horas extra y novedades. Ninguna decisión borra el tiempo registrado." />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Horas extra por decidir" value={String(otPending.length)} icon={Timer} footnote={formatMinutes(otPending.reduce((a, o) => a + o.detectedMinutes, 0))} />
        <StatCard label="Novedades por decidir" value={String(nvPending.length)} icon={CalendarX} />
        <StatCard label="Jornadas por revisar" value={String(review.length)} icon={ClipboardPen} footnote="sin salida" />
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div>
            <CardTitle>Horas extra</CardTitle>
            <CardDescription>Detectadas al cerrar cada jornada (tiempo registrado por encima del horario). Aprobar define cuánto pasa a la pre-nómina.</CardDescription>
          </div>
          <ScanOvertimeButton />
        </CardHeader>
        {overtime.length === 0 ? (
          <EmptyState icon={Timer} title="Sin horas extra" />
        ) : (
          <ul className="divide-y divide-border">
            {overtime.slice(0, 40).map((o) => (
              <li key={o.id} className="grid gap-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{o.employee.firstName} {o.employee.lastName}</span>
                  <span className="text-fg-muted capitalize">{day(o.workDate)}</span>
                  {o.workSession?.endAt && <span className="tabular text-fg-subtle">{formatTime(o.workSession.startAt)} – {formatTime(o.workSession.endAt)} · {o.workSession.site.name}</span>}
                  <span className="tabular font-medium">{formatMinutes(o.detectedMinutes)} detectadas</span>
                  {status[o.status]}
                  {o.status === "APPROVED" && <span className="tabular text-sm text-success">{formatMinutes(o.approvedMinutes ?? 0)} aprobadas</span>}
                </div>
                {o.employeeNote && <p className="text-xs text-fg-muted">Empleado: “{o.employeeNote}”</p>}
                {o.status === "PENDING" ? (
                  <OvertimeDecision id={o.id} detected={o.detectedMinutes} />
                ) : (
                  <p className="text-xs text-fg-subtle">Decidió {o.decidedBy?.name}{o.decidedAt ? ` el ${day(o.decidedAt)}` : ""}{o.decisionNote ? ` · “${o.decisionNote}”` : ""}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <div>
              <CardTitle>Novedades</CardTitle>
              <CardDescription>Vacaciones, incapacidades, licencias y permisos.</CardDescription>
            </div>
          </CardHeader>
          {novelties.length === 0 ? (
            <EmptyState icon={CalendarX} title="Sin novedades" />
          ) : (
            <ul className="divide-y divide-border">
              {novelties.slice(0, 30).map((n) => (
                <li key={n.id} className="grid gap-2 px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{n.employee.firstName} {n.employee.lastName}</span>
                    <span>{noveltyLabel[n.type]}{n.hours ? ` (${Number(n.hours)} h)` : ""}</span>
                    <span className="text-fg-muted capitalize">{day(n.startDate)}{n.endDate.getTime() !== n.startDate.getTime() ? ` – ${day(n.endDate)}` : ""}</span>
                    {status[n.status]}
                  </div>
                  {n.note && <p className="text-xs text-fg-muted">“{n.note}”</p>}
                  {n.status === "PENDING" ? <NoveltyDecision id={n.id} /> : n.decidedBy && <p className="text-xs text-fg-subtle">Decidió {n.decidedBy.name}{n.decisionNote ? ` · “${n.decisionNote}”` : ""}</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border p-5">
            <p className="mb-3 text-sm font-medium">Registrar una novedad (queda aprobada)</p>
            <RegisterNovelty employees={activeEmployees} types={Object.entries(noveltyLabel)} />
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <div>
              <CardTitle>Correcciones de asistencia</CardTitle>
              <CardDescription>Se agregan como marcaciones del administrador con motivo. Las marcaciones originales no se modifican.</CardDescription>
            </div>
          </CardHeader>
          {review.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-fg-muted">No hay jornadas sin salida.</p>
          ) : (
            <ul className="divide-y divide-border">
              {review.map((s) => (
                <li key={s.id} className="grid gap-2 px-5 py-4 text-sm">
                  <p>
                    <span className="font-medium">{s.employee.firstName} {s.employee.lastName}</span> · <span className="capitalize">{day(s.startAt)}</span> · entrada {formatTime(s.startAt)} · {s.site.name}
                  </p>
                  <CloseSessionForm id={s.id} />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border p-5">
            <p className="mb-3 text-sm font-medium">Agregar una jornada que no se marcó</p>
            <ManualSessionForm employees={activeEmployees} sites={sites} />
          </div>
        </Card>
      </div>
    </>
  );
}
