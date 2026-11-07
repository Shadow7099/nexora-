import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { InvitationForm, RevokeInvitationButton } from "@/components/admin/invitation-forms";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/report-table";
import { requireActor } from "@/server/current";
import { listInvitations } from "@/server/registration";

export const metadata: Metadata = { title: "Invitaciones" };

const stateBadge = {
  pending: <Badge tone="primary">Pendiente</Badge>,
  used: <Badge tone="success" dot>Usada</Badge>,
  expired: <Badge>Vencida</Badge>,
  revoked: <Badge tone="danger">Anulada</Badge>,
};

export default async function InvitationsPage() {
  const actor = await requireActor({ roles: ["SUPERADMIN"] });
  const rows = await listInvitations(actor);
  const dt = (d: Date) => formatDateTime(d, "America/Bogota");
  return (
    <AdminShell user={{ name: actor.name, companyName: "Nexora · Plataforma", roleLabel: "Superadministrador" }} logout={logoutAction} nav="platform">
      <PageHeader title="Invitaciones" description="Links para que el dueño de un negocio registre su empresa y la configure él mismo." />
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div>
            <CardTitle>Nuevo link</CardTitle>
            <CardDescription>El dueño crea su cuenta y su empresa (en modo prueba) y Nexora lo guía para configurar sedes, QR, turnos, empleados y horarios.</CardDescription>
          </div>
        </CardHeader>
        <div className="px-5 pb-5"><InvitationForm /></div>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3"><CardTitle>Enviadas</CardTitle></CardHeader>
        {rows.length === 0 ? (
          <p className="border-t border-border px-5 py-6 text-sm text-fg-muted">Aún no hay invitaciones.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs text-fg-subtle">
                    Creada {dt(r.createdAt)} · vence {dt(r.expiresAt)}
                    {r.usedAt && <> · usada {dt(r.usedAt)}</>}
                  </p>
                  {r.company && <Link href={`/plataforma/empresas/${r.company.id}`} className="text-sm text-primary hover:underline">{r.company.name}</Link>}
                </div>
                <div className="flex items-center gap-2">
                  {stateBadge[r.state]}
                  {r.state === "pending" && <RevokeInvitationButton id={r.id} label={r.label} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminShell>
  );
}
