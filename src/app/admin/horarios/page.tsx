import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/admin-shell";
import { PhaseNotice } from "@/components/layout/phase-notice";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMinutes, minutesToClock } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { weekSchedule } from "@/server/modules";

export const metadata: Metadata = { title: "Horarios" };

const short = (min: number) => minutesToClock(min).replace(":00", "").replace(" a. m.", "a").replace(" p. m.", "p");

export default async function SchedulesPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const w = await weekSchedule(actor);
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

  return (
    <>
      <PageHeader title="Horarios" description="Semana actual, calculada desde los patrones de cada empleado" />
      <PhaseNotice phase={3}>
        Los turnos que ves son reales (incluye nocturnos, partidos y rotativos). Falta: editar patrones, asignar turnos sueltos, cambios de sede y festivos.
      </PhaseNotice>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                <th className="px-4 py-2 font-medium">Empleado</th>
                {w.days.map((d) => (
                  <th key={d} className={cn("px-2 py-2 text-center font-medium capitalize", d === w.today && "text-primary")}>{dayLabel(d)}</th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Semana</th>
              </tr>
            </thead>
            <tbody>
              {w.rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${r.firstName} ${r.lastName}`} className="size-7" />
                      <div>
                        <p className="font-medium">{r.firstName} {r.lastName.split(" ")[0]}</p>
                        <p className="text-xs text-fg-subtle">{r.position}</p>
                      </div>
                    </div>
                  </td>
                  {r.perDay.map((shifts, i) => (
                    <td key={w.days[i]} className={cn("px-1.5 py-2 text-center align-middle", w.days[i] === w.today && "bg-primary-soft/40")}>
                      {shifts.length === 0 ? (
                        <span className="text-xs text-fg-subtle">—</span>
                      ) : (
                        <div className="grid gap-1">
                          {shifts.map((s) => (
                            <span key={s.start.toISOString()} title={`${s.templateName} · ${s.siteName}`}
                              className={cn("tabular rounded-md px-1.5 py-1 text-[11px] leading-tight whitespace-nowrap",
                                s.endMin > 1440 ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary")}>
                              {short(s.startMin)}–{short(s.endMin)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="tabular px-4 py-3 text-right whitespace-nowrap">{formatMinutes(r.plannedMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-4"><CardTitle>Plantillas de turno</CardTitle></CardHeader>
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {w.templates.map((t) => (
            <Badge key={t.id} tone={t.endMin > 1440 ? "accent" : "primary"}>
              {t.name} · {minutesToClock(t.startMin)} – {minutesToClock(t.endMin)} · descanso {t.breakMinutes} min
            </Badge>
          ))}
        </div>
      </Card>
      <p className="mt-3 text-xs text-fg-subtle">Horas de la semana = programadas menos descansos no pagados. Morado = turno que termina al día siguiente.</p>
    </>
  );
}
