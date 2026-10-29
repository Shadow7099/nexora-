import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listCompanies } from "@/server/company";
import { requireActor } from "@/server/current";

export const metadata: Metadata = { title: "Plataforma" };

const statusBadge = {
  TRIAL: <Badge tone="primary">Prueba</Badge>,
  ACTIVE: <Badge tone="success" dot>Activa</Badge>,
  SUSPENDED: <Badge tone="danger">Suspendida</Badge>,
};

export default async function PlatformPage() {
  const actor = await requireActor({ roles: ["SUPERADMIN"] });
  const companies = await listCompanies(actor);
  return (
    <AdminShell user={{ name: actor.name, companyName: "Nexora · Plataforma", roleLabel: "Superadministrador" }} logout={logoutAction} nav={[]}>
      <PageHeader title="Empresas" description={`${companies.length} registradas. Sin acceso a datos personales de sus empleados.`} />
      <Card className="overflow-hidden">
        {companies.length === 0 ? (
          <EmptyState icon={Building2} title="Sin empresas registradas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  <th className="px-5 py-2 font-medium">Empresa</th>
                  <th className="px-5 py-2 font-medium">Estado</th>
                  <th className="px-5 py-2 font-medium">Plan</th>
                  <th className="px-5 py-2 text-right font-medium">Empleados</th>
                  <th className="px-5 py-2 text-right font-medium">Sedes</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3">{statusBadge[c.status]}</td>
                    <td className="px-5 py-3 text-fg-muted">{c.planCode ?? "—"}</td>
                    <td className="tabular px-5 py-3 text-right">{c._count.employees}{c.maxEmployees ? ` / ${c.maxEmployees}` : ""}</td>
                    <td className="tabular px-5 py-3 text-right">{c._count.sites}{c.maxSites ? ` / ${c.maxSites}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
