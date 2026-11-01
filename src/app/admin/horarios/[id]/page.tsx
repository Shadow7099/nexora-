import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ClearOverride, OverrideForm } from "@/components/admin/override-form";
import { PatternEditor } from "@/components/admin/pattern-editor";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock } from "lucide-react";
import { localDate } from "@/lib/schedule";
import { formatTime, minutesToClock } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { listSiteOptions } from "@/server/employees";
import { AppError } from "@/server/errors";
import { mondayOf } from "@/server/modules";
import { getEmployeeSchedule, listTemplates } from "@/server/schedules";

export const metadata: Metadata = { title: "Horario del empleado" };
const fmtDate = (d: Date) => new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);

export default async function EmployeeSchedulePage({ params }: PageProps<"/admin/horarios/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  let data;
  try {
    data = await getEmployeeSchedule(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const [templates, sites] = await Promise.all([listTemplates(actor), listSiteOptions(actor)]);
  const active = templates.filter((t) => t.active);
  const today = localDate(new Date());
  const current = data.patterns.find((p) => !p.effectiveTo) ?? data.patterns[0];
  const nextMonday = mondayOf(new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10));
  const defaultSiteId = data.employee.defaultSiteId ?? sites[0]?.id ?? "";

  return (
    <>
      <Link href="/admin/horarios" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Horarios</Link>
      <PageHeader title={`Horario de ${data.employee.firstName} ${data.employee.lastName}`} description={current ? `Vigente desde ${fmtDate(current.effectiveFrom)}` : "Sin horario asignado"} />

      <Card>
        <CardHeader className="pb-4">
          <div>
            <CardTitle>Horario base</CardTitle>
            <CardDescription>Se repite cada semana (o cada dos, si es rotativo).</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {active.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Primero crea una plantilla de turno" description="En la página de Horarios, sección Plantillas de turno." />
          ) : (
            <PatternEditor
              employeeId={data.employee.id}
              templates={active.map((t) => ({ id: t.id, name: t.name, label: `${minutesToClock(t.startMin)}–${minutesToClock(t.endMin)}` }))}
              sites={sites}
              defaultSiteId={defaultSiteId}
              initial={current ? { cycleDays: current.cycleDays === 14 ? 14 : 7, days: current.days } : null}
              defaultFrom={nextMonday}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <div>
              <CardTitle>Cambio puntual</CardTitle>
              <CardDescription>Otro turno, otra sede o un día libre en una fecha. Reemplaza el horario base ese día.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <OverrideForm employeeId={data.employee.id} templates={active} sites={sites} defaultSiteId={defaultSiteId} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4"><CardTitle>Cambios programados</CardTitle></CardHeader>
          {data.overrides.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-fg-muted">No hay cambios puntuales.</p>
          ) : (
            <ul className="divide-y divide-border">
              {[...new Map(data.overrides.map((o) => [o.workDate.toISOString(), o])).values()].map((o) => {
                const date = o.workDate.toISOString().slice(0, 10);
                const sameDay = data.overrides.filter((x) => x.workDate.toISOString().slice(0, 10) === date && x.status === "PLANNED");
                return (
                  <li key={date} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
                    <span className="font-medium capitalize">{fmtDate(o.workDate)}</span>
                    {sameDay.length === 0 ? (
                      <Badge>Descanso</Badge>
                    ) : (
                      sameDay.map((x) => <Badge key={x.id} tone="warning">{x.template?.name ?? "Turno"} · {formatTime(x.startAt)}–{formatTime(x.endAt)} · {x.site.name}</Badge>)
                    )}
                    {o.note && <span className="text-xs text-fg-subtle">{o.note}</span>}
                    <span className="ml-auto"><ClearOverride employeeId={data.employee.id} date={date} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
