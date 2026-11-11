import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { LeadStatusButtons } from "@/components/admin/lead-status";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/report-table";
import { requireActor } from "@/server/current";
import { listLeads } from "@/server/leads";

export const metadata: Metadata = { title: "Solicitudes" };

const badge = {
  NEW: <Badge tone="primary" dot>Nueva</Badge>,
  CONTACTED: <Badge tone="warning">Contactada</Badge>,
  INVITED: <Badge tone="success">Invitada</Badge>,
  DISCARDED: <Badge>Descartada</Badge>,
};
const employees: Record<string, string> = { "1-5": "1 a 5", "6-15": "6 a 15", "16-30": "16 a 30", "31+": "más de 30" };

/** Negocios que pidieron invitación desde la página pública. */
export default async function LeadsPage() {
  const actor = await requireActor({ roles: ["SUPERADMIN"] });
  const leads = await listLeads(actor);
  const pending = leads.filter((l) => l.status === "NEW").length;
  return (
    <AdminShell user={{ name: actor.name, companyName: "Nexora · Plataforma", roleLabel: "Superadministrador" }} logout={logoutAction} nav="platform">
      <PageHeader
        title="Solicitudes"
        description={`Negocios que pidieron invitación desde la página de inicio. ${pending} nueva(s).`}
        actions={<Link href="/plataforma/invitaciones" className={buttonVariants()}>Generar link de invitación</Link>}
      />
      {leads.length === 0 ? (
        <Card><EmptyState icon={Inbox} title="Aún no hay solicitudes" description="Cuando alguien llene el formulario de la página de inicio, aparecerá aquí." /></Card>
      ) : (
        <ul className="grid gap-3">
          {leads.map((l) => (
            <li key={l.id}>
              <Card className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{l.businessName}</p>
                    {badge[l.status]}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">
                    {l.contactName} · <a href={`mailto:${l.email}`} className="text-primary hover:underline">{l.email}</a> · <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="text-primary hover:underline">{l.phone}</a>
                  </p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    {employees[l.employees] ?? l.employees} empleados{l.sites ? ` · ${l.sites} sede(s)` : ""}{l.city ? ` · ${l.city}` : ""} · {formatDateTime(l.createdAt, "America/Bogota")}
                  </p>
                  {l.message && <p className="mt-2 rounded-lg bg-bg-subtle px-3 py-2 text-sm break-words">{l.message}</p>}
                </div>
                <LeadStatusButtons id={l.id} status={l.status} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
