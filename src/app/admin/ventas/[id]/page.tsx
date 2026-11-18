import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileDown } from "lucide-react";
import { VoidSaleForm } from "@/components/admin/sale-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/report-table";
import { formatCOP } from "@/lib/utils";
import { METHOD_LABEL } from "@/server/cash";
import { requireActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { getSale } from "@/server/sales";

export const metadata: Metadata = { title: "Venta" };

export default async function SalePage({ params, searchParams }: PageProps<"/admin/ventas/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  const { nueva } = await searchParams;
  let s: Awaited<ReturnType<typeof getSale>>;
  try {
    s = await getSale(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const tz = s.company.timeZone;
  return (
    <>
      <Link href="/admin/ventas" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Ventas</Link>
      <PageHeader
        title={`Venta ${s.label}`}
        description={`${formatDateTime(s.createdAt, tz)} · ${s.site.name} · atendió ${s.by}`}
        actions={<a href={`/admin/ventas/${s.id}/comprobante`} className={buttonVariants({ variant: "secondary" })} download><FileDown aria-hidden /> Comprobante (PDF)</a>}
      />
      {nueva && s.status === "COMPLETED" && (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden /> Venta registrada. Se descontó el inventario y el valor entró a la caja.
        </p>
      )}
      {s.voided && (
        <p role="note" className="mb-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          Anulada el {formatDateTime(s.voided.at, tz)} por {s.voided.by}: {s.voided.reason}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
          <ul className="divide-y divide-border border-t border-border">
            {s.items.map((i) => (
              <li key={i.sku} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-fg-subtle">{i.sku} · {i.quantity.toLocaleString("es-CO")} × {formatCOP(i.unitPrice)}{i.discount ? ` − ${formatCOP(i.discount)}` : ""} · IVA {i.taxRate.toLocaleString("es-CO")} % ({formatCOP(i.tax)})</p>
                </div>
                <p className="tabular font-medium">{formatCOP(i.total)}</p>
              </li>
            ))}
          </ul>
          <dl className="grid gap-1 border-t border-border bg-bg-subtle/60 px-5 py-3 text-sm">
            <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd className="tabular">{formatCOP(s.subtotal)}</dd></div>
            {s.discountTotal > 0 && <div className="flex justify-between"><dt className="text-fg-muted">Descuentos (incluidos)</dt><dd className="tabular">−{formatCOP(s.discountTotal)}</dd></div>}
            <div className="flex justify-between"><dt className="text-fg-muted">IVA</dt><dd className="tabular">{formatCOP(s.taxTotal)}</dd></div>
            <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd className="tabular">{formatCOP(s.total)}</dd></div>
          </dl>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader><CardTitle>Cliente y pago</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p className="font-medium">{s.customer.name}</p>
              {s.customer.doc && <p className="text-fg-muted">{s.customer.doc}</p>}
              {s.customer.email && <p className="text-fg-muted">{s.customer.email}</p>}
              {s.customer.phone && <p className="text-fg-muted">{s.customer.phone}</p>}
              <p className="pt-2"><Badge>{METHOD_LABEL[s.paymentMethod]}</Badge></p>
              {s.notes && <p className="text-fg-muted">Nota: {s.notes}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Factura electrónica</CardTitle></CardHeader>
            <CardContent className="text-sm text-fg-muted">
              El comprobante en PDF es un soporte interno. El envío automático de la factura electrónica a la DIAN por medio de tu facturador (Siigo o Alegra, en <Link href="/admin/integraciones" className="text-primary hover:underline">Integraciones</Link>) se activará cuando conectes tu cuenta y lo probemos con ella.
            </CardContent>
          </Card>
          {s.status === "COMPLETED" && (
            <Card>
              <CardHeader><CardTitle>Anular</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p className="text-fg-muted">Devuelve los productos al inventario y anula el ingreso en la caja. La caja del día de la venta debe estar abierta.</p>
                <VoidSaleForm id={s.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
