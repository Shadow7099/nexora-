import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Receipt, ShoppingCart, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { formatIsoDate } from "@/lib/report-table";
import { cn, formatCOP } from "@/lib/utils";
import { METHOD_LABEL } from "@/server/cash";
import { requireActor } from "@/server/current";
import { isMissingTable } from "@/server/errors";
import { listSales } from "@/server/sales";

export const metadata: Metadata = { title: "Ventas" };

export default async function SalesPage({ searchParams }: PageProps<"/admin/ventas">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sp = await searchParams;
  let d: Awaited<ReturnType<typeof listSales>>;
  try {
    d = await listSales(actor, sp as Record<string, unknown>);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="Ventas" /><ModulePending name="Las ventas" /></>);
  }
  const f = d.filters;
  return (
    <>
      <PageHeader
        title="Ventas"
        description="Cada venta descuenta el inventario y entra a la caja. Numeración consecutiva; las ventas no se borran, se anulan."
        actions={<Link href="/admin/ventas/nueva" className={buttonVariants()}><ShoppingCart aria-hidden /> Nueva venta</Link>}
      />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Ventas de hoy" value={formatCOP(d.summary.todayTotal)} icon={Wallet} footnote={`${d.summary.todayCount} venta(s)`} />
        <StatCard label="Total del período" value={formatCOP(d.summary.total)} icon={Receipt} footnote={`${d.summary.count} venta(s) · sin anuladas`} />
        <StatCard label="IVA del período" value={formatCOP(d.summary.tax)} icon={Receipt} />
      </div>
      <Card className="mb-6 p-4">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end" role="search" aria-label="Filtrar ventas">
          <label className="grid gap-1.5 text-sm font-medium">Desde<Input type="date" name="desde" defaultValue={f.desde} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Hasta<Input type="date" name="hasta" defaultValue={f.hasta} /></label>
          <label className="grid gap-1.5 text-sm font-medium">
            Sede
            <Select name="sede" defaultValue={f.sede ?? ""}>
              <option value="">Todas</option>
              {d.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Buscar<Input name="q" defaultValue={f.q} placeholder="N.º de venta, cliente o documento" /></label>
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>
      </Card>
      {d.sales.length === 0 ? (
        <Card><EmptyState icon={Receipt} title="No hay ventas en este período" description="Registra una venta con «Nueva venta»." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  <th className="px-4 py-2 font-medium">Venta</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">Cliente</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Pago</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2"><span className="sr-only">Ver</span></th>
                </tr>
              </thead>
              <tbody>
                {d.sales.map((s) => (
                  <tr key={s.id} className={cn("border-b border-border last:border-0 hover:bg-bg-subtle/40", s.status === "VOIDED" && "opacity-60")}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/ventas/${s.id}`} className="font-medium hover:underline">{s.label}</Link>
                      <span className="block text-xs text-fg-subtle">{formatIsoDate(s.date)} · {s.site}</span>
                      {s.status === "VOIDED" && <Badge tone="danger" className="mt-1">Anulada</Badge>}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{s.customer}</td>
                    <td className="hidden px-4 py-3 text-fg-muted sm:table-cell">{METHOD_LABEL[s.method]}</td>
                    <td className={cn("tabular px-4 py-3 text-right font-medium whitespace-nowrap", s.status === "VOIDED" && "line-through")}>{formatCOP(s.total)}</td>
                    <td className="px-2 py-3"><Link href={`/admin/ventas/${s.id}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={`Ver ${s.label}`}><ChevronRight /></Link></td>
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
