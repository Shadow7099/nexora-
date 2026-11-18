import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SaleForm } from "@/components/admin/sale-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { requireActor } from "@/server/current";
import { isMissingTable } from "@/server/errors";
import { saleFormData } from "@/server/sales";

export const metadata: Metadata = { title: "Nueva venta" };

export default async function NewSalePage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  let d: Awaited<ReturnType<typeof saleFormData>>;
  try {
    d = await saleFormData(actor);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="Nueva venta" /><ModulePending name="Las ventas" /></>);
  }
  return (
    <>
      <Link href="/admin/ventas" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Ventas</Link>
      <PageHeader title="Nueva venta" description="Precios antes de IVA. Al registrarla se descuenta el inventario y el valor entra a la caja de hoy." />
      {d.products.length === 0 ? (
        <p className="text-sm text-fg-muted">Primero crea tus productos en <Link href="/admin/inventario/nuevo" className="text-primary hover:underline">Inventario</Link>.</p>
      ) : (
        <SaleForm sites={d.sites} products={d.products} customers={d.customers} />
      )}
    </>
  );
}
