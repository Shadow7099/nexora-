import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, MessageCircle } from "lucide-react";
import { AppointmentActions } from "@/components/admin/inbox";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { APPOINTMENT_STATUS_LABEL, listAppointments } from "@/server/booking";
import { requireActor } from "@/server/current";
import { isMissingTable } from "@/server/errors";

export const metadata: Metadata = { title: "Agenda" };

const TONE: Record<string, "primary" | "success" | "warning" | "danger" | "neutral"> = { BOOKED: "primary", CONFIRMED: "success", ATTENDED: "success", NO_SHOW: "warning", CANCELLED: "neutral" };
const SOURCE: Record<string, string> = { CHAT: "Botones del chat", AI: "La IA", MANUAL: "A mano" };

export default async function AgendaPage({ searchParams }: PageProps<"/admin/crm/agenda">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sp = (await searchParams) as Record<string, string | undefined>;
  let data: Awaited<ReturnType<typeof listAppointments>>;
  try {
    data = await listAppointments(actor, { desde: sp.desde, hasta: sp.hasta });
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="Agenda" /><ModulePending name="La agenda" /></>);
  }
  return (
    <>
      <PageHeader title="Agenda" description="Citas agendadas desde el chat con botones (el cliente toca el día y la hora), por la IA o a mano. Marca si asistió para ver qué anuncios traen clientes de verdad." />
      <form className="mb-4 flex flex-wrap items-end gap-2" aria-label="Fechas">
        <label className="grid gap-1 text-xs text-fg-muted">Desde<Input type="date" name="desde" defaultValue={data.from} max={data.to} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Hasta<Input type="date" name="hasta" defaultValue={data.to} min={data.from} /></label>
        <Button type="submit" variant="secondary">Ver</Button>
      </form>
      {data.days.length === 0 ? (
        <Card><EmptyState icon={CalendarCheck} title="No hay citas en estas fechas" description="Desde un chat toca «Agendar cita → Enviar horarios con botones», o deja que la IA las ofrezca sola con la respuesta automática encendida." /></Card>
      ) : (
        <div className="grid gap-5">
          {data.days.map((d) => (
            <section key={d.day} aria-label={d.label}>
              <h2 className="mb-2 text-sm font-semibold capitalize">{d.label} <span className="font-normal text-fg-subtle">· {d.items.length} cita{d.items.length === 1 ? "" : "s"}</span></h2>
              <ul className="grid gap-2">
                {d.items.map((a) => (
                  <li key={a.id}>
                    <Card className="grid gap-2 p-4 text-sm sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center">
                      <p className="text-lg font-semibold tabular-nums">{a.time}</p>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <Link href={`/admin/crm/clientes/${a.customer.id}`} className="truncate hover:underline">{a.customer.name}</Link>
                          <Badge tone={TONE[a.status]}>{APPOINTMENT_STATUS_LABEL[a.status] ?? a.status}</Badge>
                        </p>
                        <p className="text-xs text-fg-subtle">{[a.site, SOURCE[a.source] ?? a.source, a.customer.phone].filter(Boolean).join(" · ")}</p>
                        {a.notes && <p className="mt-1 text-xs text-fg-muted">{a.notes}</p>}
                        {a.conversationId && <Link href={`/admin/crm/mensajes?c=${a.conversationId}`} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"><MessageCircle className="size-3" aria-hidden /> Ver chat</Link>}
                      </div>
                      <AppointmentActions id={a.id} status={a.status} />
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
