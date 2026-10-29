import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActor } from "@/server/current";
import { listSiteOptions } from "@/server/employees";
import { NewEmployeeForm } from "./new-employee-form";

export const metadata: Metadata = { title: "Nuevo empleado" };

export default async function NewEmployeePage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sites = await listSiteOptions(actor);
  return (
    <>
      <PageHeader title="Nuevo empleado" description="Recibirá una contraseña temporal para su primer ingreso." />
      {sites.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} title="Primero crea una sede" description="Cada empleado necesita una sede habitual." />
        </Card>
      ) : (
        <NewEmployeeForm sites={sites} />
      )}
    </>
  );
}
