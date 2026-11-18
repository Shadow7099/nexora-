import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Lock, PiggyBank, Wallet } from "lucide-react";
import { CashMovementForm, CloseCashForm, ReopenCashForm, VoidCashButton } from "@/components/admin/cash-forms";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { formatDateTime, formatIsoDate } from "@/lib/report-table";
import { cn, formatCOP } from "@/lib/utils";
import { cashDay, METHOD_LABEL, METHODS } from "@/server/cash";
import { requireActor } from "@/server/current";
import { isMissingTable } from "@/server/errors";

export const metadata: Metadata = { title: "Caja" };

const TZ = "America/Bogota";
const diffBadge = (d: number) => (d === 0 ? <Badge tone="success" dot>Cuadró</Badge> : <Badge tone="warning" dot>{d > 0 ? "Sobrante" : "Faltante"} {formatCOP(Math.abs(d))}</Badge>);

export default async function CashPage({ searchParams }: PageProps<"/admin/caja">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sp = await searchParams;
  let d: Awaited<ReturnType<typeof cashDay>>;
  try {
    d = await cashDay(actor, sp as Record<string, unknown>);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="Caja" /><ModulePending name="La caja" /></>);
  }
  if (!d.site) {
    return (
      <>
        <PageHeader title="Caja" />
        <Card><EmptyState icon={Wallet} title="Aún no tienes sedes activas" description="Crea una sede para llevar su caja diaria." /></Card>
      </>
    );
  }
  const isToday = d.date === d.today;

  return (
    <>
      <PageHeader title="Caja" description="Ingresos y egresos del día por sede, cierre con arqueo e historial. Nada se borra: los errores se anulan con motivo." />

      <Card className="mb-6 p-4">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end" aria-label="Elegir sede y día">
          <label className="grid gap-1.5 text-sm font-medium">
            Sede
            <Select name="sede" defaultValue={d.site.id}>{d.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Día
            <Input type="date" name="fecha" defaultValue={d.date} max={d.today} />
          </label>
          <Button type="submit" variant="secondary">Ver</Button>
        </form>
      </Card>

      <h2 className="mb-3 flex flex-wrap items-center gap-2 text-lg font-semibold">
        {d.site.name} · {isToday ? "hoy" : formatIsoDate(d.date)}
        {d.closing ? <Badge tone="neutral"><Lock className="size-3" aria-hidden /> Cerrado</Badge> : <Badge tone="primary" dot>Abierto</Badge>}
      </h2>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saldo inicial (efectivo)" value={formatCOP(d.opening!.amount)} icon={PiggyBank} footnote={d.opening!.from ? `Contado al cierre del ${formatIsoDate(d.opening!.from)}` : "Sin cierres anteriores"} />
        <StatCard label="Ingresos" value={formatCOP(d.totals!.totalIn)} icon={ArrowDownCircle} footnote={`Efectivo ${formatCOP(d.totals!.cashIn)}`} />
        <StatCard label="Egresos" value={formatCOP(d.totals!.totalOut)} icon={ArrowUpCircle} footnote={`Efectivo ${formatCOP(d.totals!.cashOut)}`} />
        <StatCard label="Efectivo esperado en caja" value={formatCOP(d.expected!)} icon={Wallet} footnote="Saldo inicial + ingresos − egresos en efectivo" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle>Registrar movimiento</CardTitle></CardHeader>
          <CardContent>
            {d.editable ? <CashMovementForm siteId={d.site.id} date={d.date} /> : <p className="text-sm text-fg-muted">{d.closing ? "El día está cerrado." : "Este día ya no admite movimientos."}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{d.closing ? "Cierre del día" : "Cerrar el día"}</CardTitle></CardHeader>
          <CardContent>
            {d.closing ? (
              <div className="grid gap-4 text-sm">
                <p className="flex items-center gap-2 text-success"><CheckCircle2 className="size-4" aria-hidden /> Cerrado por {d.closing.by} · {formatDateTime(d.closing.at, TZ)}</p>
                <dl className="grid grid-cols-2 gap-3">
                  <div><dt className="text-xs text-fg-subtle">Esperado</dt><dd className="tabular font-medium">{formatCOP(d.closing.expected)}</dd></div>
                  <div><dt className="text-xs text-fg-subtle">Contado</dt><dd className="tabular font-medium">{formatCOP(d.closing.counted)}</dd></div>
                </dl>
                <div>{diffBadge(d.closing.difference)}</div>
                {d.closing.notes && <p className="text-fg-muted">«{d.closing.notes}»</p>}
                <ReopenCashForm closingId={d.closing.id} />
              </div>
            ) : (
              <CloseCashForm siteId={d.site.id} date={d.date} expected={d.expected!} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader><CardTitle>Por medio de pago</CardTitle></CardHeader>
        <div className="relative overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                <th className="px-4 py-2 font-medium">Medio</th>
                <th className="px-4 py-2 text-right font-medium">Ingresos</th>
                <th className="px-4 py-2 text-right font-medium">Egresos</th>
              </tr>
            </thead>
            <tbody>
              {METHODS.map((m) => (
                <tr key={m} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{METHOD_LABEL[m]}</td>
                  <td className="tabular px-4 py-2 text-right">{formatCOP(d.totals!.byMethod[m].in)}</td>
                  <td className="tabular px-4 py-2 text-right">{formatCOP(d.totals!.byMethod[m].out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-6 overflow-hidden">
        <CardHeader><CardTitle>Movimientos del día</CardTitle></CardHeader>
        {d.movements!.length === 0 ? (
          <p className="border-t border-border px-5 py-4 text-sm text-fg-muted">Aún no hay movimientos este día.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {d.movements!.map((m) => (
              <li key={m.id} className={cn("grid gap-2 px-5 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4", m.voided && "opacity-60")}>
                <div className="min-w-0">
                  <p className={cn("font-medium", m.voided && "line-through")}>{m.category}{m.description ? ` · ${m.description}` : ""}</p>
                  <p className="text-xs text-fg-subtle">{METHOD_LABEL[m.method]} · {m.by} · {formatDateTime(m.at, TZ).slice(11)}</p>
                  {m.voided && <p className="text-xs text-danger">Anulado por {m.voided.by}: {m.voided.reason}</p>}
                </div>
                <p className={cn("tabular font-semibold sm:text-right", m.type === "IN" ? "text-success" : "text-danger", m.voided && "line-through")}>
                  {m.type === "IN" ? "+" : "−"}{formatCOP(m.amount)}
                </p>
                <div className="sm:justify-self-end">{!m.voided && d.editable && !m.source && <VoidCashButton id={m.id} />}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Últimos cierres de {d.site.name}</CardTitle></CardHeader>
        {d.recent!.length === 0 ? (
          <p className="border-t border-border px-5 py-4 text-sm text-fg-muted">Aún no hay cierres.</p>
        ) : (
          <div className="relative overflow-x-auto border-t border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  <th className="px-4 py-2 font-medium">Día</th>
                  <th className="px-4 py-2 text-right font-medium">Esperado</th>
                  <th className="px-4 py-2 text-right font-medium">Contado</th>
                  <th className="px-4 py-2 font-medium">Resultado</th>
                  <th className="px-4 py-2 font-medium">Cerró</th>
                </tr>
              </thead>
              <tbody>
                {d.recent!.map((c) => (
                  <tr key={c.id} className={cn("border-b border-border last:border-0", c.reopened && "opacity-60")}>
                    <td className="px-4 py-2 whitespace-nowrap"><Link href={`/admin/caja?sede=${d.site!.id}&fecha=${c.date}`} className="text-primary hover:underline">{formatIsoDate(c.date)}</Link></td>
                    <td className="tabular px-4 py-2 text-right whitespace-nowrap">{formatCOP(c.expected)}</td>
                    <td className="tabular px-4 py-2 text-right whitespace-nowrap">{formatCOP(c.counted)}</td>
                    <td className="px-4 py-2">{c.reopened ? <span className="text-xs text-fg-muted">Reabierto: {c.reopened.reason}</span> : diffBadge(c.difference)}</td>
                    <td className="px-4 py-2 text-fg-muted">{c.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
