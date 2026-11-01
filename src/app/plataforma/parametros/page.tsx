import type { Metadata } from "next";
import { logoutAction } from "@/app/(auth)/actions";
import { ParameterVersionForm, VerifyParameterButton } from "@/components/admin/parameter-forms";
import { ParameterTable } from "@/components/admin/parameter-table";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PARAMETER_INFO } from "@/lib/labor-parameter-info";
import { localDate } from "@/lib/schedule";
import { requireActor } from "@/server/current";
import { listLaborParameters } from "@/server/payroll";

export const metadata: Metadata = { title: "Parámetros laborales" };

export default async function PlatformParametersPage() {
  const actor = await requireActor({ roles: ["SUPERADMIN"] });
  const rows = await listLaborParameters(actor);
  const today = new Date(`${localDate(new Date())}T00:00:00Z`);
  return (
    <AdminShell user={{ name: actor.name, companyName: "Nexora · Plataforma", roleLabel: "Superadministrador" }} logout={logoutAction} nav="platform">
      <PageHeader title="Parámetros laborales" description="Valores nacionales que usan todas las empresas. Valídalos con un contador antes de usarlos." />
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div>
            <CardTitle>Nueva versión</CardTitle>
            <CardDescription>Cuando cambie una norma (p. ej. el salario mínimo del próximo año). La versión anterior se cierra el día previo; nada se borra.</CardDescription>
          </div>
        </CardHeader>
        <div className="px-5 pb-5">
          <ParameterVersionForm options={Object.entries(PARAMETER_INFO).map(([key, v]) => ({ key, label: v.label }))} />
        </div>
      </Card>
      <ParameterTable rows={rows} today={today} action={(r) => (r.verifiedAt ? null : <VerifyParameterButton id={r.id} label={r.label} />)} />
    </AdminShell>
  );
}
