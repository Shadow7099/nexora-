import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, MessageCircle, Target, TrendingUp, UserPlus, Users } from "lucide-react";
import { CompleteTaskButton, DealStageSelect } from "@/components/admin/crm-forms";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatDateTime } from "@/lib/report-table";
import { cn, formatCOP } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { pendingTasks, pipeline, SOURCE_LABEL } from "@/server/crm";
import { isMissingTable } from "@/server/errors";

export const metadata: Metadata = { title: "CRM" };

const COLUMN_TONE: Record<string, string> = { WON: "border-success/40", LOST: "border-danger/30" };

export default async function CrmPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  let data: [Awaited<ReturnType<typeof pipeline>>, Awaited<ReturnType<typeof pendingTasks>>];
  try {
    data = await Promise.all([pipeline(actor), pendingTasks(actor)]);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="CRM" /><ModulePending name="El CRM" /></>);
  }
  const [p, tasks] = data;
  return (
    <>
      <PageHeader
        title="CRM"
        description="Embudo de oportunidades y seguimientos. Los leads de Facebook, Instagram, WhatsApp y TikTok entran solos cuando conectas esas cuentas en Integraciones."
        actions={
          <>
            <Link href="/admin/crm/mensajes" className={buttonVariants({ variant: "secondary" })}><MessageCircle aria-hidden /> Mensajes</Link>
            <Link href="/admin/crm/clientes" className={buttonVariants({ variant: "secondary" })}><Users aria-hidden /> Clientes</Link>
            <Link href="/admin/crm/clientes/nuevo" className={buttonVariants()}><UserPlus aria-hidden /> Nuevo cliente</Link>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Valor en oportunidades abiertas" value={formatCOP(p.openValue)} icon={Target} />
        <StatCard label="Tasa de cierre (30 días)" value={p.winRate == null ? "—" : `${p.winRate} %`} icon={TrendingUp} footnote="Ganadas ÷ (ganadas + perdidas)" />
        <StatCard label="Tareas pendientes" value={String(tasks.length)} icon={CalendarClock} footnote={`${tasks.filter((t) => t.overdue).length} vencida(s)`} />
      </div>

      {tasks.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader><CardTitle>Seguimientos pendientes</CardTitle></CardHeader>
          <ul className="divide-y divide-border border-t border-border">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{t.body}</p>
                  <p className={cn("text-xs", t.overdue ? "text-danger" : "text-fg-subtle")}>
                    <Link href={`/admin/crm/clientes/${t.customerId}`} className="hover:underline">{t.customer}</Link> · {t.overdue ? "venció " : ""}{formatDateTime(t.dueAt, "America/Bogota")}
                  </p>
                </div>
                <CompleteTaskButton id={t.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold">Embudo</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {p.columns.map((c) => (
          <section key={c.stage} aria-labelledby={`col-${c.stage}`} className={cn("rounded-xl border bg-bg-subtle/40 p-3", COLUMN_TONE[c.stage] ?? "border-border")}>
            <header className="mb-3 flex items-center justify-between gap-2">
              <h3 id={`col-${c.stage}`} className="font-semibold">{c.label} <span className="text-sm font-normal text-fg-subtle">({c.items.length})</span></h3>
              <span className="tabular text-sm text-fg-muted">{formatCOP(c.total)}</span>
            </header>
            {c.items.length === 0 ? (
              <p className="py-4 text-center text-xs text-fg-subtle">{c.stage === "WON" || c.stage === "LOST" ? "Nada en los últimos 30 días" : "Sin oportunidades"}</p>
            ) : (
              <ul className="grid gap-2">
                {c.items.map((d) => (
                  <li key={d.id} className="grid gap-2 rounded-lg border border-border bg-surface p-3 text-sm shadow-card">
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-xs text-fg-subtle"><Link href={`/admin/crm/clientes/${d.customerId}`} className="text-primary hover:underline">{d.customer}</Link>{d.phone ? ` · ${d.phone}` : ""}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {d.value != null && <span className="tabular font-medium">{formatCOP(d.value)}</span>}
                      <Badge>{SOURCE_LABEL[d.source] ?? d.source}</Badge>
                    </div>
                    <DealStageSelect id={d.id} stage={c.stage} label={d.title} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
