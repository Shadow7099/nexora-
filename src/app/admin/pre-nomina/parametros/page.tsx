import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ParameterTable } from "@/components/admin/parameter-table";
import { PageHeader } from "@/components/layout/admin-shell";
import { localDate } from "@/lib/schedule";
import { requireActor } from "@/server/current";
import { listLaborParameters } from "@/server/payroll";

export const metadata: Metadata = { title: "Parámetros laborales" };

export default async function ParametersPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const rows = await listLaborParameters(actor);
  const today = new Date(`${localDate(new Date())}T00:00:00Z`);
  const pending = rows.filter((r) => !r.verifiedAt).length;
  return (
    <>
      <Link href="/admin/pre-nomina" className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Volver a la pre-nómina</Link>
      <PageHeader title="Parámetros laborales" description="Valores legales de Colombia usados en la pre-nómina, con su norma y fecha de vigencia. Solo lectura." />
      <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="text-fg-muted">
          <p className="font-medium text-fg">Para validar con tu contador</p>
          <p className="mt-0.5">
            Nexora no inventa porcentajes: cada cálculo usa el valor vigente en la fecha de cada día trabajado. {pending > 0 ? `${pending} valor(es) aún no han sido validados.` : "Todos los valores están validados."}{" "}
            Si encuentras un valor que no coincide con la norma, avísale a soporte de Nexora: los cambios se cargan como una nueva versión y la historia no se borra.
          </p>
        </div>
      </div>
      <ParameterTable rows={rows} today={today} />
    </>
  );
}
