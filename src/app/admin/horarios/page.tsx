import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { TemplateList } from "@/components/admin/template-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMinutes, minutesToClock } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { weekSchedule } from "@/server/modules";
import { listTemplates } from "@/server/schedules";

export const metadata: Metadata = { title: "Horarios" };

const short = (min: number) => minutesToClock(min).replace(":00", "").replace(" a. m.", "a").replace(" p. m.", "p");
const hhmm = (min: number) => `${String(Math.floor((min % 1440) / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export default async function SchedulesPage({ searchParams }: PageProps<"/admin/horarios">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { semana } = await searchParams;
  const offset = Number(semana) || 0;
  const [w, templates] = await Promise.all([weekSchedule(actor, offset), listTemplates(actor)]);
  const dayLabel = (iso: string) => new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  const range = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" });
  const nav = (n: number) => (n === 0 ? "/admin/horarios" : `/admin/horarios?semana=${n}`);

  return (
    <>
      <PageHeader
        title="Horarios"
        description={`Semana del ${range.format(new Date(`${w.days[0]}T12:00:00Z`))} al ${range.format(new Date(`${w.days[6]}T12:00:00Z`))}`}
        actions={
          <div className="flex gap-1">
            <Link href={nav(offset - 1)} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Semana anterior"><ChevronLeft /></Link>
            {offset !== 0 && <Link href={nav(0)} className={buttonVariants({ variant: "secondary" })}>Esta semana</Link>}
            <Link href={nav(offset + 1)} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Semana siguiente"><ChevronRight /></Link>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                <th className="px-4 py-2 font-medium">Empleado</th>
                {w.days.map((d) => (
                  <th key={d} className={cn("px-2 py-2 text-center font-medium capitalize", d === w.today && "text-primary")}>
                    {dayLabel(d)}
                    {w.holidays.has(d) && (
                      <span className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-normal text-accent normal-case" title={w.holidays.get(d)}>
                        <PartyPopper className="size-3" aria-hidden /> Festivo
                      </span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Semana</th>
              </tr>
            </thead>
            <tbody>
              {w.rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/horarios/${r.id}`} className="flex items-center gap-2 hover:underline">
                      <Avatar name={`${r.firstName} ${r.lastName}`} className="size-7" />
                      <div>
                        <p className="font-medium">{r.firstName} {r.lastName.split(" ")[0]}</p>
                        <p className="text-xs text-fg-subtle">{r.position}</p>
                      </div>
                    </Link>
                  </td>
                  {r.perDay.map((shifts, i) => (
                    <td key={w.days[i]} className={cn("px-1.5 py-2 text-center align-middle", w.days[i] === w.today && "bg-primary-soft/40", w.holidays.has(w.days[i]!) && "bg-accent-soft/40")}>
                      {shifts.length === 0 ? (
                        <span className="text-xs text-fg-subtle">—</span>
                      ) : (
                        <div className="grid gap-1">
                          {shifts.map((s) => (
                            <span
                              key={s.start.toISOString()}
                              title={`${s.templateName} · ${s.siteName}${s.override ? " · cambio puntual" : ""}`}
                              className={cn(
                                "tabular rounded-md px-1.5 py-1 text-[11px] leading-tight whitespace-nowrap",
                                s.endMin > 1440 ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary",
                                s.override && "ring-1 ring-warning",
                              )}
                            >
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
      <p className="mt-3 text-xs text-fg-subtle">
        Toca un empleado para cambiar su horario. Morado: termina al día siguiente · borde amarillo: cambio puntual · horas = programadas menos descansos no pagados.
      </p>

      <Card className="mt-6">
        <CardHeader className="pb-4">
          <div>
            <CardTitle>Plantillas de turno</CardTitle>
            <CardDescription>Los turnos que se asignan en los horarios. Si el fin es antes del inicio, termina al día siguiente.</CardDescription>
          </div>
        </CardHeader>
        <div className="px-5 pb-5">
          <TemplateList
            templates={templates.map((t) => ({
              id: t.id, name: t.name, start: hhmm(t.startMin), end: hhmm(t.endMin), breakMinutes: t.breakMinutes, breakPaid: t.breakPaid, color: t.color, active: t.active,
              uses: t._count.patternDays, label: `${minutesToClock(t.startMin)} – ${minutesToClock(t.endMin)}${t.endMin > 1440 ? " (+1)" : ""}`,
            }))}
          />
        </div>
      </Card>
    </>
  );
}
