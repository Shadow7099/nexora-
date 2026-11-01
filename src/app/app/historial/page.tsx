import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinutes, formatTime } from "@/lib/utils";
import { employeeHistory } from "@/server/attendance";
import { requireActor } from "@/server/current";

export const metadata: Metadata = { title: "Historial" };

const day = (d: Date, timeZone: string) => new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone }).format(d);

export default async function HistoryPage() {
  const actor = await requireActor({ roles: ["EMPLOYEE"] });
  const { timezone: TZ, sessions } = await employeeHistory(actor);
  const total = sessions.reduce((a, s) => a + (s.endAt ? (s.endAt.getTime() - s.startAt.getTime()) / 60000 : 0), 0);
  return (
    <section className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">Últimos 31 días · {formatMinutes(Math.round(total))} registradas</p>
      <Card>
        {sessions.length === 0 ? (
          <EmptyState icon={BarChart3} title="Aún no tienes jornadas registradas" description="Cuando marques con el QR de tu sede, aquí verás tus entradas, salidas y horas." />
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium capitalize">{day(s.startAt, TZ)}</p>
                  <p className="tabular text-xs text-fg-subtle">
                    {formatTime(s.startAt, TZ)} – {s.endAt ? formatTime(s.endAt, TZ) : s.status === "OPEN" ? "en curso" : "sin salida"} · {s.site.name}
                  </p>
                </div>
                {s.status === "NEEDS_REVIEW" ? (
                  <Badge tone="accent">En revisión</Badge>
                ) : s.endAt ? (
                  <span className="tabular text-sm font-medium">{formatMinutes(Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000))}</span>
                ) : (
                  <Badge tone="success" dot>En curso</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
