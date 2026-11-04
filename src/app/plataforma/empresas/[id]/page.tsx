import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { CompanyStatusButtons, ResetAdminPassword } from "@/components/admin/platform-forms";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/report-table";
import { requireActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { getCompanyForPlatform } from "@/server/platform";
import { planLabel, trialDaysLeft } from "@/lib/plans";

export const metadata: Metadata = { title: "Empresa" };

const statusBadge = {
  TRIAL: <Badge tone="primary">Prueba</Badge>,
  ACTIVE: <Badge tone="success" dot>Activa</Badge>,
  SUSPENDED: <Badge tone="danger">Suspendida</Badge>,
};

export default async function PlatformCompanyPage({ params }: PageProps<"/plataforma/empresas/[id]">) {
  const actor = await requireActor({ roles: ["SUPERADMIN"] });
  const { id } = await params;
  let c: Awaited<ReturnType<typeof getCompanyForPlatform>>;
  try {
    c = await getCompanyForPlatform(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const dt = (d: Date | null) => (d ? formatDateTime(d, "America/Bogota") : "Nunca");
  return (
    <AdminShell user={{ name: actor.name, companyName: "Nexora · Plataforma", roleLabel: "Superadministrador" }} logout={logoutAction} nav="platform">
      <Link href="/plataforma" className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Volver a empresas</Link>
      <PageHeader title={c.name} description={[c.legalName, c.nit ? `NIT ${c.nit}` : null, `creada ${dt(c.createdAt)}`].filter(Boolean).join(" · ")} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">Estado</p>
            {statusBadge[c.status]}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-fg-subtle">Plan</dt><dd>{planLabel(c.planCode)}</dd></div>
            {c.status === "TRIAL" && c.trialEndsAt && (
              <div><dt className="text-xs text-fg-subtle">Fin de la prueba</dt><dd className="tabular">{c.trialEndsAt.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}{trialDaysLeft(c.trialEndsAt) === 0 ? " (vencida)" : ""}</dd></div>
            )}
            <div><dt className="text-xs text-fg-subtle">Empleados activos</dt><dd className="tabular">{c._count.employees}{c.maxEmployees ? ` / ${c.maxEmployees}` : ""}</dd></div>
            <div><dt className="text-xs text-fg-subtle">Sedes activas</dt><dd className="tabular">{c._count.sites}{c.maxSites ? ` / ${c.maxSites}` : ""}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-fg-muted">Suspender cierra al instante las sesiones de todos sus usuarios y les impide ingresar. Los datos no se borran.</p>
          <div className="mt-3"><CompanyStatusButtons id={c.id} current={c.status} /></div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3"><CardTitle>Administradores</CardTitle></CardHeader>
          <ul className="divide-y divide-border border-t border-border">
            {c.users.map((u) => (
              <li key={u.id} className="grid gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{u.name}</p>
                  <p className="truncate text-sm text-fg-muted">{u.email}</p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    Último ingreso: {dt(u.lastLoginAt)}
                    {u.mustChangePassword ? " · debe crear su contraseña" : ""}
                    {u.lockedUntil && u.lockedUntil > new Date() ? " · bloqueado por intentos fallidos" : ""}
                  </p>
                </div>
                <ResetAdminPassword companyId={c.id} userId={u.id} name={u.name} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
