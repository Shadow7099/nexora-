import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { updateCustomerAction } from "@/app/admin/crm/actions";
import { ActivityForm, CompleteTaskButton, CustomerForm, DealForm, DealStageSelect } from "@/components/admin/crm-forms";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/report-table";
import { cn, formatCOP } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { ACTIVITY_LABEL, getCustomer, OPEN_STAGES, SOURCE_LABEL, STAGE_LABEL } from "@/server/crm";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Cliente" };
const TZ = "America/Bogota";

export default async function CustomerPage({ params }: PageProps<"/admin/crm/clientes/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  let d: Awaited<ReturnType<typeof getCustomer>>;
  try {
    d = await getCustomer(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const c = d.customer;
  const wa = c.phone ? `https://wa.me/${c.phone.length === 10 ? `57${c.phone}` : c.phone}` : null;
  const openDeals = d.deals.filter((x) => OPEN_STAGES.includes(x.stage));

  return (
    <>
      <Link href="/admin/crm/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Clientes</Link>
      <PageHeader title={c.name} description={`${SOURCE_LABEL[c.source] ?? c.source} · cliente desde ${formatDateTime(c.createdAt, TZ).slice(0, 10)} · ${d.sales.count} compra(s) por ${formatCOP(d.sales.total)}`} />
      <div className="mb-6 flex flex-wrap gap-2">
        {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm hover:border-primary"><Phone className="size-4" aria-hidden /> {c.phone}</a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm hover:border-primary"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>}
        {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm hover:border-primary"><Mail className="size-4" aria-hidden /> {c.email}</a>}
        {c.marketingConsent ? (
          <Badge tone="success"><ShieldCheck className="size-3" aria-hidden /> Autorizó mensajes comerciales{c.consentSource ? ` · ${c.consentSource}` : ""}</Badge>
        ) : (
          <Badge tone="warning">Sin autorización para promociones</Badge>
        )}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader><CardTitle>Registrar seguimiento</CardTitle></CardHeader>
            <CardContent><ActivityForm customerId={c.id} deals={openDeals.map((x) => ({ id: x.id, title: x.title }))} /></CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
            {d.activities.length === 0 ? (
              <p className="border-t border-border px-5 py-4 text-sm text-fg-muted">Aún no hay seguimientos.</p>
            ) : (
              <ol className="divide-y divide-border border-t border-border">
                {d.activities.map((a) => (
                  <li key={a.id} className="grid gap-1 px-5 py-3 text-sm">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                      <Badge tone={a.type === "LEAD" ? "primary" : a.type === "TASK" ? "warning" : "neutral"}>{ACTIVITY_LABEL[a.type] ?? a.type}</Badge>
                      {formatDateTime(a.at, TZ)} · {a.by}{a.deal ? ` · ${a.deal}` : ""}
                    </p>
                    <p className={cn("whitespace-pre-line", a.doneAt && "text-fg-muted line-through")}>{a.body}</p>
                    {a.type === "TASK" && a.dueAt && (
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className={a.doneAt ? "text-success" : "text-fg-muted"}>{a.doneAt ? <><CheckCircle2 className="inline size-3" aria-hidden /> Hecha</> : `Para el ${formatDateTime(a.dueAt, TZ)}`}</span>
                        {!a.doneAt && <CompleteTaskButton id={a.id} />}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Oportunidades</CardTitle></CardHeader>
            {d.deals.length > 0 && (
              <ul className="divide-y divide-border border-t border-border">
                {d.deals.map((x) => (
                  <li key={x.id} className="grid gap-2 px-5 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{x.title}</p>
                      {x.value != null && <span className="tabular">{formatCOP(x.value)}</span>}
                    </div>
                    <p className="text-xs text-fg-subtle">{STAGE_LABEL[x.stage]} · {SOURCE_LABEL[x.source] ?? x.source}{x.owner ? ` · ${x.owner}` : ""}{x.lostReason ? ` · ${x.lostReason}` : ""}</p>
                    <DealStageSelect id={x.id} stage={x.stage} label={x.title} />
                  </li>
                ))}
              </ul>
            )}
            <CardContent className="border-t border-border pt-4"><DealForm customerId={c.id} users={d.users} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Datos del cliente</CardTitle></CardHeader>
            <CardContent>
              <CustomerForm
                action={updateCustomerAction.bind(null, c.id)}
                submitLabel="Guardar"
                values={{
                  name: c.name, documentType: c.documentType ?? "", documentNumber: c.documentNumber ?? "", phone: c.phone ?? "", email: c.email ?? "",
                  city: c.city ?? "", address: c.address ?? "", notes: c.notes ?? "", marketingConsent: c.marketingConsent ? "on" : "",
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
