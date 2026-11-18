import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bot, Camera, CheckCheck, MessageCircle, MessagesSquare, Search, Sparkles, UserRound } from "lucide-react";
import { AiConfigForm, AiPanelActions, AutoRefresh, Composer, GapItem, ScrollToEnd, SyncTemplatesButton, TemplateActions, TemplateForm, TemplateSender } from "@/components/admin/inbox";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AI_TAG_LABEL, getAiConfig } from "@/server/crm-ai";
import { requireActor } from "@/server/current";
import { AppError, isMissingTable } from "@/server/errors";
import { CHANNEL_LABEL, getConversation, listConversations, type Channel } from "@/server/messages";
import { listTemplates, STATUS_LABEL } from "@/server/wa-templates";

export const metadata: Metadata = { title: "Mensajes" };

const TZ = "America/Bogota";
const timeShort = (d: Date) => {
  const day = (x: Date) => x.toLocaleDateString("es-CO", { timeZone: TZ });
  return day(d) === day(new Date()) ? d.toLocaleTimeString("es-CO", { timeZone: TZ, hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString("es-CO", { timeZone: TZ, day: "numeric", month: "short" });
};
const timeFull = (d: Date) => d.toLocaleString("es-CO", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
const CHANNEL_ICON: Record<Channel, typeof MessageCircle> = { WHATSAPP: MessageCircle, MESSENGER: MessagesSquare, INSTAGRAM: Camera };
const STATUS_ICON: Record<string, string> = { SENT: "✓", DELIVERED: "✓✓", READ: "✓✓ leído", FAILED: "no entregado" };
const ORIGIN_LABEL: Record<string, string> = { AI: "IA", PHONE: "Celular", NEXORA: "" };
const TEMPLATE_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = { APPROVED: "success", PENDING: "warning", REJECTED: "danger", DRAFT: "neutral", PAUSED: "warning", DISABLED: "danger" };

type Tab = "chats" | "ia" | "plantillas";

type Actor = Awaited<ReturnType<typeof requireActor>>;

export default async function InboxPage({ searchParams }: PageProps<"/admin/crm/mensajes">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sp = (await searchParams) as Record<string, string | undefined>;
  const tab: Tab = sp.tab === "ia" || sp.tab === "plantillas" ? sp.tab : "chats";
  let data: { tab: "chats"; d: ChatsData } | { tab: "ia"; d: Awaited<ReturnType<typeof getAiConfig>> } | { tab: "plantillas"; d: Awaited<ReturnType<typeof listTemplates>> };
  try {
    data = tab === "chats" ? { tab, d: await loadChats(actor, sp) } : tab === "ia" ? { tab, d: await getAiConfig(actor) } : { tab, d: await listTemplates(actor) };
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="Mensajes" /><ModulePending name="La bandeja de mensajes" /></>);
  }
  return (
    <>
      <Link href="/admin/crm" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> CRM</Link>
      <PageHeader title="Mensajes" description="WhatsApp, Messenger e Instagram en un solo lugar, unidos a la ficha de cada cliente. La IA etiqueta, resume y prepara la respuesta." />
      <nav aria-label="Secciones de mensajes" className="mb-5 flex gap-1 overflow-x-auto rounded-lg bg-bg-subtle p-1 text-sm">
        {([["chats", "Chats"], ["ia", "IA de mensajes"], ["plantillas", "Plantillas de WhatsApp"]] as const).map(([k, l]) => (
          <Link key={k} href={`/admin/crm/mensajes${k === "chats" ? "" : `?tab=${k}`}`} aria-current={tab === k ? "page" : undefined} className={cn("rounded-md px-3 py-1.5 font-medium whitespace-nowrap", tab === k ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}>{l}</Link>
        ))}
      </nav>
      {data.tab === "chats" ? <Chats data={data.d} sp={sp} /> : data.tab === "ia" ? <AiTab d={data.d} /> : <TemplatesTab templates={data.d} />}
    </>
  );
}

type ChatsData = Awaited<ReturnType<typeof loadChats>>;

async function loadChats(actor: Actor, sp: Record<string, string | undefined>) {
  // Primero la conversación abierta (la marca como leída) y después la lista.
  let conv: Awaited<ReturnType<typeof getConversation>> | null = null;
  if (sp.c) {
    try {
      conv = await getConversation(actor, sp.c);
    } catch (e) {
      if (!(e instanceof AppError && e.code === "NOT_FOUND")) throw e;
    }
  }
  const list = await listConversations(actor, sp);
  const templates = conv && !conv.canReply && conv.channel === "WHATSAPP" ? (await listTemplates(actor)).filter((t) => t.status === "APPROVED") : [];
  return { list, conv, templates };
}

function Chats({ data, sp }: { data: ChatsData; sp: Record<string, string | undefined> }) {
  const { list, conv, templates } = data;
  const qs = (c?: string) => `/admin/crm/mensajes?${new URLSearchParams({ ...(sp.canal ? { canal: sp.canal } : {}), ...(sp.q ? { q: sp.q } : {}), ...(c ? { c } : {}) })}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <AutoRefresh />
      <section aria-label="Conversaciones" className={cn("min-w-0", conv && "hidden lg:block")}>
        <form className="mb-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2" role="search" aria-label="Buscar conversaciones">
          <label className="relative">
            <span className="sr-only">Buscar cliente</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input name="q" defaultValue={sp.q} placeholder="Buscar cliente" className="pl-9" />
          </label>
          <label>
            <span className="sr-only">Canal</span>
            <Select name="canal" defaultValue={sp.canal ?? ""} className="w-32">
              <option value="">Todos</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MESSENGER">Messenger</option>
              <option value="INSTAGRAM">Instagram</option>
            </Select>
          </label>
          <Button type="submit" variant="secondary">Ver</Button>
        </form>
        {list.conversations.length === 0 ? (
          <Card><EmptyState icon={MessageCircle} title="Aún no hay conversaciones" description="Conecta WhatsApp, Facebook o Instagram en Integraciones y pega la URL privada en tu app de Meta: los mensajes llegarán aquí." /></Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="max-h-[70dvh] divide-y divide-border overflow-y-auto">
              {list.conversations.map((c) => {
                const Icon = CHANNEL_ICON[c.channel];
                return (
                  <li key={c.id}>
                    <Link href={qs(c.id)} aria-current={conv?.id === c.id ? "page" : undefined} className={cn("grid gap-1 px-4 py-3 text-sm hover:bg-bg-subtle/60", conv?.id === c.id && "bg-primary-soft/60")}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 font-medium">
                          <Icon className="size-4 shrink-0 text-fg-subtle" aria-label={CHANNEL_LABEL[c.channel]} />
                          <span className="truncate">{c.customer}</span>
                        </span>
                        <span className="shrink-0 text-xs text-fg-subtle">{timeShort(c.at)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-fg-muted">{c.preview ?? ""}</span>
                        {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-fg" aria-label={`${c.unread} sin leer`}>{c.unread}</span>}
                      </span>
                      {(c.needsHuman || c.aiTag) && (
                        <span className="flex flex-wrap gap-1">
                          {c.needsHuman && <Badge tone="warning"><UserRound className="size-3" aria-hidden /> Persona</Badge>}
                          {c.aiTag && <Badge>{AI_TAG_LABEL[c.aiTag] ?? c.aiTag}</Badge>}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section aria-label="Conversación" className={cn("min-w-0", !conv && "hidden lg:block")}>
        {!conv ? (
          <Card className="grid h-full min-h-80 place-items-center p-8 text-center text-sm text-fg-muted">Elige una conversación para leerla y responder.</Card>
        ) : (
          <Card className="flex min-h-[70dvh] flex-col overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <Link href={qs()} className="mb-1 inline-flex items-center gap-1 text-xs text-fg-muted lg:hidden"><ArrowLeft className="size-3" aria-hidden /> Conversaciones</Link>
                <p className="truncate font-semibold"><Link href={`/admin/crm/clientes/${conv.customer.id}`} className="hover:underline">{conv.customer.name}</Link></p>
                <p className="text-xs text-fg-subtle">{CHANNEL_LABEL[conv.channel]}{conv.customer.phone ? ` · ${conv.customer.phone}` : ""}</p>
              </div>
              {conv.canReply ? <Badge tone="success" dot>Puedes responder hasta {timeShort(conv.windowEndsAt!)}</Badge> : <Badge tone="warning">Ventana de 24 h cerrada</Badge>}
            </header>

            {(conv.ai.at || conv.ai.error) && (
              <div className="grid gap-2 border-b border-border bg-accent-soft/40 px-4 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium"><Sparkles className="size-4 text-accent" aria-hidden /> IA{conv.ai.tag && <Badge>{AI_TAG_LABEL[conv.ai.tag] ?? conv.ai.tag}</Badge>}{conv.ai.paused && <Badge tone="warning">Pausada en este chat</Badge>}</p>
                {conv.ai.summary && <p className="text-fg-muted">{conv.ai.summary}</p>}
                {conv.ai.needsHuman && <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-fg" role="note"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> Debe atenderlo una persona{conv.ai.humanReason ? `: ${conv.ai.humanReason}` : "."}</p>}
                {conv.ai.suggestion && <p className="rounded-lg border border-accent/30 bg-surface px-3 py-2 whitespace-pre-line"><span className="block text-xs font-medium text-accent">Respuesta sugerida</span>{conv.ai.suggestion}</p>}
                {conv.ai.error && <p className="text-xs text-danger" role="alert">{conv.ai.error}</p>}
                <AiPanelActions conversationId={conv.id} paused={conv.ai.paused} />
              </div>
            )}

            <ol className="flex-1 space-y-2 overflow-y-auto bg-bg-subtle/30 px-4 py-4" aria-label="Mensajes">
              {conv.messages.map((m) => (
                <li key={m.id} className={cn("flex", m.direction === "IN" ? "justify-start" : "justify-end")}>
                  <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line shadow-card", m.direction === "IN" ? "rounded-bl-md bg-surface" : m.status === "FAILED" ? "rounded-br-md bg-danger-soft" : "rounded-br-md bg-primary text-primary-fg")}>
                    <span className="sr-only">{m.direction === "IN" ? "Cliente: " : "Nosotros: "}</span>
                    {m.kind === "template" && <span className="mb-1 block text-[11px] opacity-80">Plantilla</span>}
                    {m.body}
                    <span className={cn("mt-1 flex items-center justify-end gap-1 text-[11px]", m.direction === "IN" ? "text-fg-subtle" : m.status === "FAILED" ? "text-danger" : "text-primary-fg/80")}>
                      {m.direction === "OUT" && m.origin === "AI" && <Bot className="size-3" aria-label="Enviado por la IA" />}
                      {m.direction === "OUT" && ORIGIN_LABEL[m.origin] ? `${ORIGIN_LABEL[m.origin]} · ` : m.by ? `${m.by} · ` : ""}
                      {timeFull(m.at)}
                      {m.direction === "OUT" && <span aria-label={`Estado: ${STATUS_ICON[m.status] ?? m.status}`}>{m.status === "READ" ? <CheckCheck className="size-3.5" /> : ` ${STATUS_ICON[m.status] ?? ""}`}</span>}
                    </span>
                    {m.status === "FAILED" && m.error && <span className="mt-1 block text-[11px] text-danger">{m.error}</span>}
                  </div>
                </li>
              ))}
              <ScrollToEnd count={conv.messages.length} />
            </ol>

            <footer className="border-t border-border p-3">
              {conv.canReply ? (
                <Composer conversationId={conv.id} suggestion={conv.ai.suggestion} />
              ) : conv.channel === "WHATSAPP" ? (
                <div className="grid gap-2">
                  <p className="text-xs text-fg-muted">Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp solo deja escribirle con una plantilla aprobada.</p>
                  <TemplateSender conversationId={conv.id} templates={templates} customerFirstName={conv.customer.name.split(" ")[0] ?? ""} />
                </div>
              ) : (
                <p className="text-sm text-fg-muted">Pasaron más de 24 h desde el último mensaje: {CHANNEL_LABEL[conv.channel]} no deja escribirle hasta que el cliente vuelva a escribir.</p>
              )}
            </footer>
          </Card>
        )}
      </section>
    </div>
  );
}

function AiTab({ d }: { d: Awaited<ReturnType<typeof getAiConfig>> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="size-4 text-accent" aria-hidden /> IA de mensajes</CardTitle></CardHeader>
        <CardContent>
          {!d.claudeConnected && (
            <p className="mb-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-fg" role="note">
              Para usar la IA, guarda tu llave de Claude en <Link href="/admin/integraciones" className="font-medium text-primary hover:underline">Integraciones</Link>. El uso se cobra en tu cuenta de Anthropic.
            </p>
          )}
          <AiConfigForm values={{ ...d.config, mode: d.config.mode }} claudeConnected={d.claudeConnected} />
        </CardContent>
      </Card>
      <Card className={cn(d.gaps.length > 0 && "border-warning/50")}>
        <CardHeader><CardTitle>Lo que le falta a la IA {d.gaps.length > 0 && <Badge tone="warning">{d.gaps.length}</Badge>}</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-fg-muted">Preguntas de clientes que la IA no pudo responder porque le falta un dato del negocio. Respóndelas una vez y se agregan a lo que sabe.</p>
          {d.gaps.length === 0 ? <p className="text-sm text-fg-subtle">No le falta ningún dato por ahora.</p> : (
            <ul className="grid gap-3">{d.gaps.map((g) => <GapItem key={g.id} {...g} />)}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesTab({ templates }: { templates: Awaited<ReturnType<typeof listTemplates>> }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle>Nueva plantilla</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">Las plantillas son los únicos mensajes que WhatsApp deja enviar después de 24 h sin respuesta del cliente (retomar chats, recordatorios, promociones). Meta las revisa antes de aprobarlas.</p>
          </div>
        </CardHeader>
        <CardContent><TemplateForm /></CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="flex-wrap gap-3">
          <CardTitle>Tus plantillas</CardTitle>
          <SyncTemplatesButton />
        </CardHeader>
        {templates.length === 0 ? (
          <p className="border-t border-border px-5 py-4 text-sm text-fg-muted">Aún no tienes plantillas. Crea una arriba o toca «Sincronizar con Meta» si ya las tienes allá.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {templates.map((t) => (
              <li key={t.id} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">{t.name} <Badge tone={TEMPLATE_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge><span className="text-xs font-normal text-fg-subtle">{t.category === "MARKETING" ? "Marketing" : "Utilidad"} · {t.language}</span></p>
                  <p className="mt-1 whitespace-pre-line text-fg-muted">{t.body}</p>
                  {t.buttons.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{t.buttons.map((b) => <span key={b} className="rounded-full border border-border px-2 py-0.5 text-xs">{b}</span>)}</p>}
                  {t.rejectReason && <p className="mt-1 text-xs text-danger">Motivo del rechazo: {t.rejectReason}</p>}
                </div>
                <TemplateActions id={t.id} canSubmit={t.status === "DRAFT" || t.status === "REJECTED"} canDelete={t.status === "DRAFT" || t.status === "REJECTED"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
