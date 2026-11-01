import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CancelNovelty, NoveltyRequestForm, OvertimeNote } from "@/components/employee/request-forms";
import { formatMinutes } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { myNovelties, noveltyLabel } from "@/server/novelties";
import { myOvertime } from "@/server/overtime";

export const metadata: Metadata = { title: "Solicitudes" };

const day = (d: Date) => new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
const status = {
  PENDING: <Badge tone="warning" dot>Pendiente</Badge>,
  APPROVED: <Badge tone="success">Aprobada</Badge>,
  REJECTED: <Badge tone="danger">Rechazada</Badge>,
  CANCELLED: <Badge>Retirada</Badge>,
};
const EMPLOYEE_TYPES = Object.entries(noveltyLabel).filter(([k]) => k !== "AUSENCIA_INJUSTIFICADA" && k !== "SUSPENSION");

export default async function MyRequestsPage() {
  const actor = await requireActor({ roles: ["EMPLOYEE"] });
  const [overtime, novelties] = await Promise.all([myOvertime(actor), myNovelties(actor)]);
  return (
    <section className="grid gap-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitudes</h1>
        <p className="mt-1 text-sm text-fg-muted">Permisos, vacaciones y tus horas extra.</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Pedir un permiso o vacaciones</h2>
        <Card className="p-4"><NoveltyRequestForm types={EMPLOYEE_TYPES} /></Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Mis permisos y novedades</h2>
        <Card>
          {novelties.length === 0 ? (
            <p className="p-4 text-sm text-fg-muted">Aún no has pedido ninguno.</p>
          ) : (
            <ul className="divide-y divide-border">
              {novelties.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{noveltyLabel[n.type]}{n.hours ? ` · ${Number(n.hours)} h` : ""}</p>
                    <p className="text-xs text-fg-subtle capitalize">{day(n.startDate)}{n.endDate.getTime() !== n.startDate.getTime() ? ` – ${day(n.endDate)}` : ""}</p>
                    {n.decisionNote && n.status !== "PENDING" && <p className="mt-1 text-xs text-fg-muted">“{n.decisionNote}”</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {status[n.status]}
                    {n.status === "PENDING" && <CancelNovelty id={n.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Mis horas extra</h2>
        <Card>
          {overtime.length === 0 ? (
            <p className="p-4 text-sm text-fg-muted">No tienes horas extra registradas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {overtime.map((o) => (
                <li key={o.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium capitalize">{day(o.workDate)}</p>
                      <p className="tabular text-xs text-fg-subtle">
                        {formatMinutes(o.detectedMinutes)} por encima de tu horario
                        {o.status === "APPROVED" ? ` · ${formatMinutes(o.approvedMinutes ?? 0)} aprobadas` : ""}
                      </p>
                    </div>
                    {status[o.status]}
                  </div>
                  {o.decisionNote && o.status !== "PENDING" && <p className="mt-1 text-xs text-fg-muted">“{o.decisionNote}”</p>}
                  {o.status === "PENDING" && (o.employeeNote ? <p className="mt-1 text-xs text-fg-muted">Tu explicación: “{o.employeeNote}”</p> : <OvertimeNote id={o.id} />)}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <p className="mt-2 text-xs text-fg-subtle">Tus horas trabajadas siempre quedan registradas, aunque una hora extra no se apruebe.</p>
      </div>
    </section>
  );
}
