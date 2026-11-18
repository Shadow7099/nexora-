import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Package, PackagePlus, Search, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatCOP } from "@/lib/utils";
import { ModulePending } from "@/components/layout/module-pending";
import { requireActor } from "@/server/current";
import { isMissingTable } from "@/server/errors";
import { listProducts, UNIT_LABEL } from "@/server/inventory";

export const metadata: Metadata = { title: "Inventario" };

const n = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 3 });

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventario">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sp = await searchParams;
  let data: Awaited<ReturnType<typeof listProducts>>;
  try {
    data = await listProducts(actor, sp as Record<string, unknown>);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (
      <>
        <PageHeader title="Inventario" />
        <ModulePending name="El inventario" />
      </>
    );
  }
  const { rows, sites, categories, summary, filters: f } = data;
  const filtered = !!(f.q || f.categoria || f.sede || f.bajo || f.inactivos);

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Productos y servicios, stock por sede y movimientos. Cada movimiento queda registrado con autor y motivo."
        actions={<Link href="/admin/inventario/nuevo" className={buttonVariants()}><PackagePlus aria-hidden /> Nuevo producto</Link>}
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Productos activos" value={String(summary.products)} icon={Package} />
        <StatCard label="En o bajo el mínimo" value={String(summary.low)} icon={AlertTriangle} />
        <StatCard label="Valor del inventario (a costo)" value={formatCOP(summary.value)} icon={Wallet} footnote={summary.withoutCost ? `${summary.withoutCost} producto(s) sin costo no suman` : undefined} />
      </div>

      <Card className="mb-6 p-4">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end" role="search" aria-label="Filtrar productos">
          <label className="grid gap-1.5 text-sm font-medium">
            Buscar
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <Input name="q" defaultValue={f.q} placeholder="Nombre, código o código de barras" className="pl-9" />
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Categoría
            <Select name="categoria" defaultValue={f.categoria ?? ""}>
              <option value="">Todas</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Sede
            <Select name="sede" defaultValue={f.sede ?? ""}>
              <option value="">Todas (stock total)</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </label>
          <Button type="submit" variant="secondary">Filtrar</Button>
          <div className="flex flex-wrap gap-4 text-sm text-fg-muted sm:col-span-4">
            <label className="flex items-center gap-2"><input type="checkbox" name="bajo" value="1" defaultChecked={!!f.bajo} className="size-4 accent-[var(--primary)]" /> Solo en o bajo el mínimo</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="inactivos" value="1" defaultChecked={!!f.inactivos} className="size-4 accent-[var(--primary)]" /> Incluir inactivos</label>
            {filtered && <Link href="/admin/inventario" className="text-primary hover:underline">Quitar filtros</Link>}
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={filtered ? "Ningún producto coincide" : "Aún no tienes productos"}
            description={filtered ? "Prueba con otro filtro." : "Crea tus productos y servicios; luego registra las entradas para tener el stock al día."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">Categoría</th>
                  <th className="px-4 py-2 text-right font-medium">Precio</th>
                  <th className="px-4 py-2 text-right font-medium">Stock</th>
                  <th className="px-2 py-2"><span className="sr-only">Ver</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={cn("border-b border-border last:border-0 hover:bg-bg-subtle/40", !r.active && "opacity-60")}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/inventario/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                      <span className="block text-xs text-fg-subtle">{r.sku}{r.kind === "SERVICE" ? " · servicio" : ""}{!r.active ? " · inactivo" : ""}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-fg-muted md:table-cell">{r.category ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-right whitespace-nowrap">{formatCOP(r.price)}</td>
                    <td className="tabular px-4 py-3 text-right whitespace-nowrap">
                      {r.stock == null ? <span className="text-fg-subtle">—</span> : (
                        <>
                          {n(r.stock)} <span className="text-xs text-fg-subtle">{UNIT_LABEL[r.unit as keyof typeof UNIT_LABEL]?.toLowerCase()}</span>
                          {r.low && <Badge tone="warning" className="ml-2">Mínimo</Badge>}
                        </>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/admin/inventario/${r.id}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={`Ver ${r.name}`}><ChevronRight /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
