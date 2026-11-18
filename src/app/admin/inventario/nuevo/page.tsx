import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createProductAction } from "@/app/admin/inventario/actions";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/server/current";
import { listProducts } from "@/server/inventory";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { categories } = await listProducts(actor, { inactivos: "1" });
  return (
    <>
      <Link href="/admin/inventario" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Inventario</Link>
      <PageHeader title="Nuevo producto" description="Después de crearlo registra la entrada inicial para tener el stock al día." />
      <Card className="max-w-3xl">
        <CardContent>
          <ProductForm action={createProductAction} submitLabel="Crear producto" values={{ kind: "PRODUCT", unit: "UNIDAD", taxRate: "0" }} categories={categories} />
        </CardContent>
      </Card>
    </>
  );
}
