import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCustomerAction } from "@/app/admin/crm/actions";
import { CustomerForm } from "@/components/admin/crm-forms";
import { PageHeader } from "@/components/layout/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/server/current";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewCustomerPage() {
  await requireActor({ roles: ["COMPANY_ADMIN"] });
  return (
    <>
      <Link href="/admin/crm/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Clientes</Link>
      <PageHeader title="Nuevo cliente" />
      <Card className="max-w-3xl"><CardContent><CustomerForm action={createCustomerAction} values={{}} submitLabel="Crear cliente" /></CardContent></Card>
    </>
  );
}
