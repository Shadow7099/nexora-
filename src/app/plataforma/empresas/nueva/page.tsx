import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { NewCompanyForm } from "@/components/admin/platform-forms";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/server/current";

export const metadata: Metadata = { title: "Nueva empresa" };

export default async function NewCompanyPage() {
  const actor = await requireActor({ roles: ["SUPERADMIN"] });
  return (
    <AdminShell user={{ name: actor.name, companyName: "Nexora · Plataforma", roleLabel: "Superadministrador" }} logout={logoutAction} nav="platform">
      <Link href="/plataforma" className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Volver a empresas</Link>
      <PageHeader title="Nueva empresa" description="Se crea en modo prueba con su primer administrador. Él configura sedes, empleados y horarios." />
      <Card className="max-w-3xl p-5">
        <NewCompanyForm />
      </Card>
    </AdminShell>
  );
}
