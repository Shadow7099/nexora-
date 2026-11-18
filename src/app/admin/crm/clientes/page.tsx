import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireActor } from "@/server/current";
import { listCustomers, SOURCE_LABEL } from "@/server/crm";
import { isMissingTable } from "@/server/errors";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/crm/clientes">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  let d: Awaited<ReturnType<typeof listCustomers>>;
  try {
    d = await listCustomers(actor, (await searchParams) as Record<string, unknown>);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="Clientes" /><ModulePending name="El CRM" /></>);
  }
  return (
    <>
      <Link href="/admin/crm" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> CRM</Link>
      <PageHeader title="Clientes" description="Todos tus clientes: los que registras, los de las ventas y los que llegan de redes." actions={<Link href="/admin/crm/clientes/nuevo" className={buttonVariants()}><UserPlus aria-hidden /> Nuevo cliente</Link>} />
      <Card className="mb-6 p-4">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end" role="search" aria-label="Buscar clientes">
          <label className="grid gap-1.5 text-sm font-medium">
            Buscar
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <Input name="q" defaultValue={d.filters.q} placeholder="Nombre, celular, correo o documento" className="pl-9" />
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Origen
            <Select name="origen" defaultValue={d.filters.origen ?? ""}>
              <option value="">Todos</option>
              {Object.entries(SOURCE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </label>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
      </Card>
      {d.customers.length === 0 ? (
        <Card><EmptyState icon={Users} title="No hay clientes" description="Crea uno o conecta tus redes en Integraciones para recibir leads." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {d.customers.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/crm/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-bg-subtle/40">
                  <span className="min-w-0">
                    <span className="block font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-fg-subtle">{[c.phone, c.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <Badge>{SOURCE_LABEL[c.source] ?? c.source}</Badge>
                    {c.openDeals > 0 && <Badge tone="primary">{c.openDeals} abierta(s)</Badge>}
                    <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
