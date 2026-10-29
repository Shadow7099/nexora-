import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActor } from "@/server/current";
import { listEmployees } from "@/server/employees";

export const metadata: Metadata = { title: "Empleados" };

export default async function EmployeesPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const employees = await listEmployees(actor);
  const active = employees.filter((e) => e.status === "ACTIVE").length;

  return (
    <>
      <PageHeader
        title="Empleados"
        description={`${active} activos${employees.length > active ? ` · ${employees.length - active} inactivos` : ""}`}
        actions={
          <Link href="/admin/empleados/nuevo" className={buttonVariants()}>
            <UserPlus /> Nuevo empleado
          </Link>
        }
      />
      <Card className="overflow-hidden">
        {employees.length === 0 ? (
          <EmptyState icon={Users} title="Aún no hay empleados" description="Crea el primero para asignarle sede, horario y acceso." />
        ) : (
          <ul className="divide-y divide-border">
            {employees.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/empleados/${e.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle/60 sm:px-5">
                  <Avatar name={`${e.firstName} ${e.lastName}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">
                      {e.firstName} {e.lastName}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">
                      {e.position} · {e.defaultSite?.name ?? "Sin sede"} · {e.documentType} {e.documentNumber}
                    </p>
                  </div>
                  <span className="hidden text-xs text-fg-subtle md:block">{e.user.email}</span>
                  {e.status === "ACTIVE" ? <Badge tone="success" dot>Activo</Badge> : <Badge>Inactivo</Badge>}
                  <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
