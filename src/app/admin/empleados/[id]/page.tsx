import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contractTypeLabel, payFrequencyLabel } from "@/lib/labels";
import { formatCOP, formatDate, formatTime } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { getEmployee, listSiteOptions } from "@/server/employees";
import { AppError } from "@/server/errors";
import { EditEmployeeForm, NewContractForm, ResetPasswordButton, StatusButton } from "./employee-forms";

export const metadata: Metadata = { title: "Empleado" };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const shortDate = (d: Date) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);

export default async function EmployeePage({ params }: PageProps<"/admin/empleados/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  let e;
  try {
    e = await getEmployee(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const sites = await listSiteOptions(actor);
  const current = e.contracts.find((c) => !c.endDate) ?? e.contracts[0];
  const active = e.status === "ACTIVE";

  return (
    <>
      <Link href="/admin/empleados" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Empleados
      </Link>
      <PageHeader
        title={`${e.firstName} ${e.lastName}`}
        description={`${e.position} · ${e.defaultSite?.name ?? "Sin sede"}`}
        actions={active ? <Badge tone="success" dot>Activo</Badge> : <Badge>Inactivo</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos personales y acceso</CardTitle>
            </CardHeader>
            <CardContent>
              <EditEmployeeForm
                id={e.id}
                sites={sites}
                values={{
                  firstName: e.firstName, lastName: e.lastName, documentType: e.documentType, documentNumber: e.documentNumber,
                  email: e.user.email, phone: e.phone ?? "", position: e.position, defaultSiteId: e.defaultSiteId ?? undefined, hireDate: iso(e.hireDate),
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Contrato</CardTitle>
                <CardDescription>Historial de condiciones. La pre-nómina usa las vigentes en cada fecha.</CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto px-5">
              <table className="w-full min-w-[520px] text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-fg-subtle">
                    <th className="py-2 font-medium">Vigencia</th>
                    <th className="py-2 font-medium">Tipo</th>
                    <th className="py-2 text-right font-medium">Salario</th>
                    <th className="py-2 text-right font-medium">Horas/sem.</th>
                    <th className="py-2 font-medium pl-4">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {e.contracts.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-2.5">
                        {shortDate(c.startDate)} – {c.endDate ? shortDate(c.endDate) : <Badge tone="primary">vigente</Badge>}
                      </td>
                      <td className="py-2.5 text-fg-muted">{contractTypeLabel[c.contractType]}</td>
                      <td className="tabular py-2.5 text-right">{formatCOP(Number(c.monthlySalary))}</td>
                      <td className="tabular py-2.5 text-right">{Number(c.weeklyHours)}</td>
                      <td className="py-2.5 pl-4 text-fg-muted">{payFrequencyLabel[c.payFrequency]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CardContent className="border-t border-border mt-4">
              <p className="mb-4 text-sm font-medium">Nuevas condiciones (aumento, cambio de jornada…)</p>
              <NewContractForm
                id={e.id}
                values={current ? {
                  contractType: current.contractType, salaryType: current.salaryType, monthlySalary: String(Number(current.monthlySalary)),
                  weeklyHours: String(Number(current.weeklyHours)), payFrequency: current.payFrequency, arlRiskClass: current.arlRiskClass,
                } : {}}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Acceso</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div>
                <p className="text-xs text-fg-subtle">Último ingreso</p>
                <p>{e.user.lastLoginAt ? `${formatDate(e.user.lastLoginAt)}, ${formatTime(e.user.lastLoginAt)}` : "Nunca ha ingresado"}</p>
              </div>
              {e.user.mustChangePassword && <Badge tone="warning">Debe cambiar la contraseña temporal</Badge>}
              {active && <ResetPasswordButton id={e.id} />}
              <StatusButton id={e.id} active={active} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
