import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, History } from "lucide-react";
import { movementAction, setProductActiveAction, updateProductAction } from "@/app/admin/inventario/actions";
import { MovementForm } from "@/components/admin/movement-form";
import { ProductActiveToggle, ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/report-table";
import { cn, formatCOP } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { getProduct, listProducts, MOVEMENT_LABEL, UNIT_LABEL } from "@/server/inventory";

export const metadata: Metadata = { title: "Producto" };

const n = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 3 });

export default async function ProductPage({ params, searchParams }: PageProps<"/admin/inventario/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  const { creado } = await searchParams;
  let d: Awaited<ReturnType<typeof getProduct>>;
  try {
    d = await getProduct(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { categories } = await listProducts(actor, { inactivos: "1" });
  const p = d.product;
  const unit = UNIT_LABEL[p.unit as keyof typeof UNIT_LABEL]?.toLowerCase() ?? p.unit;
  const isProduct = p.kind === "PRODUCT";
  const low = isProduct && p.minStock > 0 && d.total <= p.minStock;

  return (
    <>
      <Link href="/admin/inventario" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Inventario</Link>
      <PageHeader
        title={p.name}
        description={`${p.sku}${p.category ? ` · ${p.category}` : ""} · ${formatCOP(p.price)} + IVA ${n(p.taxRate)} %${p.cost != null ? ` · costo ${formatCOP(p.cost)}` : ""}`}
        actions={<ProductActiveToggle active={p.active} action={setProductActiveAction.bind(null, p.id, !p.active)} />}
      />
      {creado && (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden /> Producto creado.{isProduct ? " Registra la entrada inicial abajo." : ""}
        </p>
      )}
      <div className="mb-6 flex flex-wrap gap-2">
        {!p.active && <Badge tone="danger">Inactivo</Badge>}
        {!isProduct && <Badge>Servicio · sin inventario</Badge>}
        {low && <Badge tone="warning" dot>En o bajo el mínimo ({n(p.minStock)})</Badge>}
      </div>

      {isProduct && (
        <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card>
            <CardHeader><CardTitle>Stock por sede</CardTitle></CardHeader>
            <ul className="divide-y divide-border border-t border-border">
              {d.bySite.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>{s.name}{!s.active && <span className="text-fg-subtle"> (inactiva)</span>}</span>
                  <span className={cn("tabular font-medium", s.qty < 0 && "text-danger")}>{n(s.qty)} {unit}</span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-bg-subtle/60 px-5 py-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular">{n(d.total)} {unit}</span>
              </li>
            </ul>
          </Card>
          <Card>
            <CardHeader><CardTitle>Registrar movimiento</CardTitle></CardHeader>
            <CardContent>
              {p.active ? (
                <MovementForm action={movementAction.bind(null, p.id)} sites={d.bySite.filter((s) => s.active)} />
              ) : (
                <p className="text-sm text-fg-muted">Activa el producto para registrar movimientos.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isProduct && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-4 text-fg-subtle" aria-hidden /> Movimientos</CardTitle></CardHeader>
          {d.movements.length === 0 ? (
            <p className="border-t border-border px-5 py-4 text-sm text-fg-muted">Aún no hay movimientos.</p>
          ) : (
            <div className="relative overflow-x-auto border-t border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Movimiento</th>
                    <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-4 py-2 font-medium">Motivo</th>
                    <th className="px-4 py-2 font-medium">Por</th>
                  </tr>
                </thead>
                <tbody>
                  {d.movements.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap text-fg-muted">{formatDateTime(m.at, "America/Bogota")}</td>
                      <td className="px-4 py-2">{MOVEMENT_LABEL[m.type]}<span className="block text-xs text-fg-subtle">{m.siteName}</span></td>
                      <td className={cn("tabular px-4 py-2 text-right whitespace-nowrap font-medium", m.quantity > 0 ? "text-success" : "text-danger")}>
                        {m.quantity > 0 ? "+" : ""}{n(m.quantity)}
                        {m.unitCost != null && <span className="block text-xs font-normal text-fg-subtle">{formatCOP(m.unitCost)} c/u</span>}
                      </td>
                      <td className="px-4 py-2">{m.reason}{m.reference && <span className="block text-xs text-fg-subtle">Ref. {m.reference}</span>}</td>
                      <td className="px-4 py-2 text-fg-muted">{m.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card className="max-w-3xl">
        <CardHeader><CardTitle>Datos del producto</CardTitle></CardHeader>
        <CardContent>
          <ProductForm
            action={updateProductAction.bind(null, p.id)}
            submitLabel="Guardar cambios"
            categories={categories}
            values={{
              kind: p.kind, sku: p.sku, name: p.name, category: p.category ?? "", unit: p.unit, price: String(p.price), taxRate: String(p.taxRate),
              cost: p.cost == null ? "" : String(p.cost), minStock: p.minStock ? String(p.minStock) : "", barcode: p.barcode ?? "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
