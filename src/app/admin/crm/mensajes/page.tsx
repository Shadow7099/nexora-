import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BellRing, CalendarCheck, Bot, Camera, CheckCheck, ExternalLink, FlaskConical, Megaphone, MessageCircle, MessagesSquare, Search, Sparkles, UserRound } from "lucide-react";
import { AiConfigForm, AiPanelActions, AutoRefresh, AutoReplyToggle, BookingConfigForm, BookingPanel, LearningPanel, MessageButtons, ChatAiToggle, CommentCard, Composer, DemoControls, GapItem, ResolveButton, ScrollToEnd, SimulateCustomer, SyncTemplatesButton, TemplateActions, TemplateForm, TemplateSender } from "@/components/admin/inbox";
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
import { adsReport, CHANNEL_LABEL, getConversation, inboxAlerts, listConversations, type Channel } from "@/server/messages";
import { hasDemo } from "@/server/crm-demo";
import { nextAppointment, slotOptions } from "@/server/booking";
import { listVersions, SECTION_LABEL, SOURCE_LABEL } from "@/server/crm-learning";
import { listSiteOptions } from "@/server/employees";
import { COMMENT_STATUS_LABEL, COMMENT_TYPE_LABEL, listComments, PRIVATE_REPLY_DAYS } from "@/server/social-comments";
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

type Tab = "chats" | "comentarios" | "anuncios" | "ia" | "plantillas";
const TABS = ["chats", "comentarios", "anuncios", "ia", "plantillas"] as const;
const cop = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type Actor = Awaited<ReturnType<typeof requireActor>>;

export default async function InboxPage({ searchParams }: PageProps<"/admin/crm/mensajes">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sp = (await searchParams) as Record<string, string | undefined>;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "chats";
  // Primero los datos (try/catch), después la pantalla.
  type Data =
    | { tab: "chats"; d: ChatsData } | { tab: "comentarios"; d: Awaited<ReturnType<typeof listComments>> } | { tab: "anuncios"; d: Awaited<ReturnType<typeof adsReport>> }
    | { tab: "ia"; d: AiData } | { tab: "plantillas"; d: Awaited<ReturnType<typeof listTemplates>> };
  let alerts: Awaited<ReturnType<typeof inboxAlerts>>;
  let data: Data;
  try {
    alerts = await inboxAlerts(actor);
    data =
      tab === "chats" ? { tab, d: await loadChats(actor, sp) }
      : tab === "comentarios" ? { tab, d: await listComments(actor, sp.estado) }
      : tab === "anuncios" ? { tab, d: await adsReport(actor, { desde: sp.desde, hasta: sp.hasta }) }
      : tab === "ia" ? { tab, d: await loadAi(actor) }
      : { tab: "plantillas", d: await listTemplates(actor) };
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return (<><PageHeader title="Mensajes" /><ModulePending name="La bandeja de mensajes" /></>);
  }
  const body =
    data.tab === "chats" ? <Chats data={data.d} sp={sp} alerts={alerts} />
    : data.tab === "comentarios" ? <CommentsTab d={data.d} />
    : data.tab === "anuncios" ? <AdsTab d={data.d} />
    : data.tab === "ia" ? <AiTab d={data.d} />
    : <TemplatesTab templates={data.d} />;
  const labels: Record<Tab, React.ReactNode> = {
    chats: <>Chats{alerts.unread > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] text-primary-fg">{alerts.unread}</span>}</>,
    comentarios: <>Comentarios de redes{alerts.comments > 0 && <span className="ml-1.5 rounded-full bg-warning px-1.5 text-[11px] text-white">{alerts.comments}</span>}</>,
    anuncios: "Anuncios",
    ia: <>IA de mensajes{alerts.gaps > 0 && <span className="ml-1.5 rounded-full bg-warning px-1.5 text-[11px] text-white">{alerts.gaps}</span>}</>,
    plantillas: "Plantillas de WhatsApp",
  };
  return (
    <>
      <Link href="/admin/crm" className="mb-4 hidden items-center gap-1 text-sm text-fg-muted hover:text-fg sm:inline-flex"><ArrowLeft className="size-4" aria-hidden /> CRM</Link>
      <div className={cn(tab === "chats" && sp.c && "hidden lg:block")}>
        <PageHeader title="Mensajes" description="WhatsApp, Messenger e Instagram en un solo lugar, unidos a la ficha de cada cliente. La IA etiqueta, resume y prepara la respuesta; ves de qué anuncio llegó cada chat." />
      </div>
      <nav aria-label="Secciones de mensajes" className={cn("-mx-4 mb-4 flex gap-1 overflow-x-auto bg-bg-subtle p-1 px-4 text-sm sm:mx-0 sm:rounded-lg sm:px-1", tab === "chats" && sp.c && "hidden lg:flex")}>
        {TABS.map((k) => (
          <Link key={k} href={`/admin/crm/mensajes${k === "chats" ? "" : `?tab=${k}`}`} aria-current={tab === k ? "page" : undefined} className={cn("shrink-0 rounded-md px-3 py-1.5 font-medium whitespace-nowrap", tab === k ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}>{labels[k]}</Link>
        ))}
      </nav>
      {body}
    </>
  );
}

type ChatsData = Awaited<ReturnType<typeof loadChats>>;
type AiData = Awaited<ReturnType<typeof loadAi>>;

async function loadAi(actor: Actor) {
  const [ai, learning, sites] = await Promise.all([getAiConfig(actor), listVersions(actor), listSiteOptions(actor)]);
  const c = ai.config as Partial<{ bookingEnabled: boolean; bookingSiteId: string | null; slotMinutes: number; slotCapacity: number }>;
  return { ...ai, learning, sites, booking: { enabled: c.bookingEnabled ?? true, siteId: c.bookingSiteId ?? null, slotMinutes: c.slotMinutes ?? 60, capacity: c.slotCapacity ?? 1 } };
}

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
  const [ai, demo, slots, next] = await Promise.all([getAiConfig(actor), hasDemo(actor), conv ? slotOptions(actor) : null, conv ? nextAppointment(actor, conv.customer.id) : null]);
  return { list, conv, templates, autoReply: ai.config.enabled && ai.config.mode === "AUTO", claudeConnected: ai.claudeConnected, demo, slots, next };
}

function Chats({ data, sp, alerts }: { data: ChatsData; sp: Record<string, string | undefined>; alerts: Awaited<ReturnType<typeof inboxAlerts>> }) {
  const { list, conv, templates } = data;
  const qs = (c?: string) => `/admin/crm/mensajes?${new URLSearchParams({ ...(sp.canal ? { canal: sp.canal } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.ver ? { ver: sp.ver } : {}), ...(sp.anuncio ? { anuncio: sp.anuncio } : {}), ...(c ? { c } : {}) })}`;
  const notices = [
    alerts.needsHuman > 0 && { tone: "danger", icon: UserRound, href: "/admin/crm/mensajes?ver=atender", text: `${alerts.needsHuman} chat${alerts.needsHuman === 1 ? "" : "s"} ${alerts.needsHuman === 1 ? "pide" : "piden"} que lo${alerts.needsHuman === 1 ? "" : "s"} atienda una persona` },
    alerts.adsToday > 0 && { tone: "primary", icon: Megaphone, href: "/admin/crm/mensajes?ver=anuncios", text: `${alerts.adsToday} chat${alerts.adsToday === 1 ? "" : "s"} nuevo${alerts.adsToday === 1 ? "" : "s"} hoy por anuncios${alerts.latestAd ? ` · el último: ${alerts.latestAd.customer.name} desde «${alerts.latestAd.adTitle ?? `anuncio ${alerts.latestAd.adId}`}» (${CHANNEL_LABEL[alerts.latestAd.channel as Channel]})` : ""}` },
    alerts.appointmentsToday > 0 && { tone: "primary", icon: CalendarCheck, href: "/admin/crm/agenda", text: `${alerts.appointmentsToday} cita${alerts.appointmentsToday === 1 ? "" : "s"} nueva${alerts.appointmentsToday === 1 ? "" : "s"} hoy desde el chat` },
    alerts.comments > 0 && { tone: "warning", icon: MessagesSquare, href: "/admin/crm/mensajes?tab=comentarios", text: `${alerts.comments} comentario${alerts.comments === 1 ? "" : "s"} de redes por responder` },
    alerts.gaps > 0 && { tone: "warning", icon: Sparkles, href: "/admin/crm/mensajes?tab=ia", text: `La IA necesita ${alerts.gaps} dato${alerts.gaps === 1 ? "" : "s"} para responder sola sin pasar chats a una persona` },
  ].filter(Boolean) as { tone: "danger" | "primary" | "warning"; icon: typeof UserRound; href: string; text: string }[];
  const NOTICE_TONE = { danger: "border-danger/30 bg-danger-soft text-fg", primary: "border-primary/30 bg-primary-soft text-fg", warning: "border-warning/40 bg-warning-soft text-fg" };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <AutoRefresh />
      <section aria-label="Conversaciones" className={cn("grid min-w-0 content-start gap-3", conv && "hidden lg:grid")}>
        {notices.length > 0 && (
          <ul className="grid gap-2" aria-label="Avisos">
            {notices.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm hover:brightness-95", NOTICE_TONE[n.tone])}>
                  <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden /><n.icon className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{n.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <AutoReplyToggle on={data.autoReply} claudeConnected={data.claudeConnected} />
        <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" role="search" aria-label="Buscar conversaciones">
          <label className="relative">
            <span className="sr-only">Buscar cliente</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input name="q" defaultValue={sp.q} placeholder="Buscar cliente" className="pl-9" />
          </label>
          <Button type="submit" variant="secondary">Buscar</Button>
          <label>
            <span className="sr-only">Canal</span>
            <Select name="canal" defaultValue={sp.canal ?? ""}>
              <option value="">Todos los canales</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MESSENGER">Messenger</option>
              <option value="INSTAGRAM">Instagram</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Mostrar</span>
            <Select name="ver" defaultValue={sp.ver ?? ""}>
              <option value="">Todos los chats</option>
              <option value="atender">Atender persona</option>
              <option value="sin_leer">Sin leer</option>
              <option value="anuncios">Llegaron por anuncios</option>
            </Select>
          </label>
          {sp.anuncio && <input type="hidden" name="anuncio" value={sp.anuncio} />}
        </form>
        {sp.anuncio && <p className="flex items-center justify-between gap-2 text-xs text-fg-muted"><span>Chats del anuncio {sp.anuncio}</span><Link href="/admin/crm/mensajes" className="text-primary hover:underline">Quitar filtro</Link></p>}
        {list.conversations.length === 0 ? (
          <Card className="grid gap-4 pb-6">
            <EmptyState icon={MessageCircle} title={sp.ver || sp.q || sp.canal || sp.anuncio ? "Ningún chat con ese filtro" : "Aún no hay conversaciones"} description="Conecta WhatsApp, Facebook o Instagram en Integraciones: los mensajes llegarán aquí. Mientras tanto, mira cómo funciona con una demostración (chats por anuncios, IA y comentarios); no se envía nada a nadie." />
            <DemoControls hasDemo={data.demo} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="max-h-[70dvh] divide-y divide-border overflow-y-auto">
              {list.conversations.map((c) => {
                const Icon = CHANNEL_ICON[c.channel];
                return (
                  <li key={c.id}>
                    <Link href={qs(c.id)} aria-current={conv?.id === c.id ? "page" : undefined} className={cn("grid min-w-0 gap-1 px-4 py-3 text-sm hover:bg-bg-subtle/60", conv?.id === c.id && "bg-primary-soft/60")}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 font-medium">
                          <Icon className="size-4 shrink-0 text-fg-subtle" aria-label={CHANNEL_LABEL[c.channel]} />
                          <span className="truncate">{c.customer}</span>
                        </span>
                        <span className="shrink-0 text-xs text-fg-subtle">{timeShort(c.at)}</span>
                      </span>
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs text-fg-muted">{c.preview ?? ""}</span>
                        {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-fg" aria-label={`${c.unread} sin leer`}>{c.unread}</span>}
                      </span>
                      {(c.needsHuman || c.aiTag || c.ad || c.aiPaused || c.demo) && (
                        <span className="flex flex-wrap gap-1">
                          {c.needsHuman && <Badge tone="danger"><UserRound className="size-3" aria-hidden /> Atender persona</Badge>}
                          {c.ad && <Badge tone="primary"><Megaphone className="size-3" aria-hidden /> <span className="max-w-40 truncate">{c.ad.title ?? "Anuncio"}</span></Badge>}
                          {c.aiTag && <Badge>{AI_TAG_LABEL[c.aiTag] ?? c.aiTag}</Badge>}
                          {c.aiPaused && <Badge tone="warning">IA pausada</Badge>}
                          {c.demo && <Badge><FlaskConical className="size-3" aria-hidden /> Demo</Badge>}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {list.conversations.length > 0 && <div className="pt-1"><DemoControls hasDemo={data.demo} compact /></div>}
      </section>

      <section aria-label="Conversación" className={cn("min-w-0", !conv && "hidden lg:block")}>
        {!conv ? (
          <Card className="grid h-full min-h-80 place-items-center p-8 text-center text-sm text-fg-muted">Elige una conversación para leerla y responder.</Card>
        ) : (
          <Card className="flex min-h-[70dvh] flex-col overflow-hidden">
            <header className="sticky top-0 z-10 grid min-w-0 gap-2 border-b border-border bg-surface px-3 py-3 sm:px-4 [&>*]:min-w-0">
              <div className="flex flex-wrap items-start gap-2">
                <Link href={qs()} className="-ml-1 grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-bg-subtle lg:hidden" aria-label="Volver a las conversaciones"><ArrowLeft className="size-5" aria-hidden /></Link>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate font-semibold"><Link href={`/admin/crm/clientes/${conv.customer.id}`} className="hover:underline">{conv.customer.name}</Link>{conv.demo && <span className="ml-2 text-[11px] font-normal text-fg-subtle">Demostración</span>}</p>
                  <p className="text-xs text-fg-subtle">{CHANNEL_LABEL[conv.channel]}{conv.customer.phone ? ` · ${conv.customer.phone}` : ""}</p>
                </div>
                <div className="ml-auto"><ChatAiToggle conversationId={conv.id} paused={conv.ai.paused} /></div>
              </div>
              {conv.ad && (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-primary-soft px-3 py-2 text-xs text-fg">
                  <Megaphone className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 basis-48">Llegó por {conv.ad.sourceType === "post" ? "una publicación" : "un anuncio"}: <strong>{conv.ad.title ?? `anuncio ${conv.ad.id}`}</strong>{conv.ad.at ? ` · ${timeShort(conv.ad.at)}` : ""}</span>
                  <Link href={`/admin/crm/mensajes?tab=anuncios`} className="text-primary hover:underline">Resultados</Link>
                  {conv.ad.url && <a href={conv.ad.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Ver anuncio <ExternalLink className="size-3" aria-hidden /></a>}
                </p>
              )}
              {conv.canReply ? <Badge tone="success" dot className="justify-self-start">Puedes responder hasta {timeShort(conv.windowEndsAt!)}</Badge> : <Badge tone="warning" className="justify-self-start">Ventana de 24 h cerrada</Badge>}
            </header>

            {(

              <div className="grid gap-2 border-b border-border bg-accent-soft/40 px-4 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium"><Sparkles className="size-4 text-accent" aria-hidden /> IA{conv.ai.tag && <Badge>{AI_TAG_LABEL[conv.ai.tag] ?? conv.ai.tag}</Badge>}{conv.ai.paused && <Badge tone="warning">Pausada en este chat</Badge>}</p>
                {conv.ai.summary && <p className="text-fg-muted">{conv.ai.summary}</p>}
                {!conv.ai.at && !conv.ai.error && <p className="text-xs text-fg-muted">Sin análisis todavía: aparece cuando el cliente escribe.</p>}
                {conv.ai.needsHuman && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-fg" role="note">
                    <AlertTriangle className="size-4 shrink-0 text-danger" aria-hidden />
                    <span className="min-w-0 flex-1 font-medium">Atender persona{conv.ai.humanReason ? `: ${conv.ai.humanReason}` : ""}</span>
                    <ResolveButton conversationId={conv.id} />
                  </div>
                )}
                {conv.ai.suggestion && <p className="rounded-lg border border-accent/30 bg-surface px-3 py-2 whitespace-pre-line"><span className="block text-xs font-medium text-accent">Respuesta sugerida</span>{conv.ai.suggestion}</p>}
                {conv.ai.error && <p className="text-xs text-danger" role="alert">{conv.ai.error}</p>}
                <AiPanelActions conversationId={conv.id} paused={conv.ai.paused} />
              </div>
            )}

            <ol className="max-h-[60dvh] min-h-64 flex-1 space-y-2 overflow-y-auto bg-bg-subtle/30 px-3 py-4 sm:px-4 lg:max-h-[55dvh]" aria-label="Mensajes">
              {conv.messages.map((m) => (
                <li key={m.id} className={cn("flex", m.direction === "IN" ? "justify-start" : "justify-end")}>
                  <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line shadow-card", m.direction === "IN" ? "rounded-bl-md bg-surface" : m.status === "FAILED" ? "rounded-br-md bg-danger-soft" : "rounded-br-md bg-primary text-primary-fg")}>
                    <span className="sr-only">{m.direction === "IN" ? "Cliente: " : "Nosotros: "}</span>
                    {m.kind === "template" && <span className="mb-1 block text-[11px] opacity-80">Plantilla</span>}
                    {m.body}
                    {m.buttons && m.buttons.length > 0 && <MessageButtons conversationId={conv.id} buttons={m.buttons} demo={conv.demo && m.direction === "OUT"} />}
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

            <footer className="grid gap-3 border-t border-border p-3">
              {conv.demo && <SimulateCustomer conversationId={conv.id} />}
              {data.slots && <BookingPanel conversationId={conv.id} options={data.slots.options} siteName={data.slots.site?.name ?? null} canReply={conv.canReply} next={data.next} />}
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

function AiTab({ d }: { d: AiData }) {
  const fmt = (x: Date) => x.toLocaleString("es-CO", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-accent" aria-hidden /> Aprendizaje diario de la IA</CardTitle></CardHeader>
        <CardContent>
          <LearningPanel
            autoLearn={d.learning.autoLearn}
            lastLearnAt={d.learning.lastLearnAt ? fmt(d.learning.lastLearnAt) : null}
            versions={d.learning.versions.map((v) => ({ id: v.id, source: v.source, at: fmt(v.at), summary: v.summary, changes: v.changes }))}
            sourceLabel={SOURCE_LABEL}
            sectionLabel={SECTION_LABEL}
          />
        </CardContent>
      </Card>
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
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="size-4 text-primary" aria-hidden /> Agenda por botones</CardTitle></CardHeader>
        <CardContent><BookingConfigForm sites={d.sites} values={d.booking} /></CardContent>
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

function CommentsTab({ d }: { d: Awaited<ReturnType<typeof listComments>> }) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-fg-muted">
        Lo que comentan en tus publicaciones y anuncios de Facebook e Instagram. La IA clasifica cada comentario y sugiere una respuesta pública corta y, si hay interés, un mensaje privado (Meta permite uno por comentario, dentro de {PRIVATE_REPLY_DAYS} días; abre el chat en <Link href="/admin/crm/mensajes" className="text-primary hover:underline">Chats</Link>). Las quejas quedan para una persona.
      </p>
      <nav aria-label="Estado de los comentarios" className="flex gap-1 overflow-x-auto text-sm">
        {Object.entries(COMMENT_STATUS_LABEL).map(([k, l]) => (
          <Link key={k} href={`/admin/crm/mensajes?tab=comentarios${k === "PENDING" ? "" : `&estado=${k}`}`} aria-current={d.status === k ? "page" : undefined} className={cn("shrink-0 rounded-full border px-3 py-1 whitespace-nowrap", d.status === k ? "border-primary bg-primary-soft text-fg" : "border-border text-fg-muted hover:text-fg")}>
            {l} {d.counts[k] ? <span className="text-xs">({d.counts[k]})</span> : null}
          </Link>
        ))}
      </nav>
      {d.rows.length === 0 ? (
        <Card className="grid gap-4 pb-6">
          <EmptyState icon={MessagesSquare} title={d.status === "PENDING" ? "No hay comentarios pendientes" : "Nada por aquí"} description="Llegan aquí cuando conectas Facebook e Instagram en Integraciones y suscribes los avisos de comentarios (feed y comments) en tu app de Meta." />
          {d.status === "PENDING" && <DemoControls hasDemo={false} />}
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {d.rows.map((c) => (
            <CommentCard
              key={c.id}
              typeLabel={c.aiType ? COMMENT_TYPE_LABEL[c.aiType] ?? c.aiType : null}
              canPrivate={c.canPrivate}
              c={{ id: c.id, channel: c.channel, authorName: c.authorName, body: c.body, postText: c.postText, postUrl: c.postUrl, at: timeFull(c.postedAt), status: c.status, aiType: c.aiType, aiSuggestion: c.aiSuggestion, aiPrivate: c.aiPrivate, aiError: c.aiError, reply: c.reply, demo: c.demo }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdsTab({ d }: { d: Awaited<ReturnType<typeof adsReport>> }) {
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : "—");
  return (
    <div className="grid gap-4">
      <p className="text-sm text-fg-muted">Chats que llegaron por un anuncio o publicación de Facebook e Instagram (botón «Enviar mensaje» o de WhatsApp) y lo que pasó después con esos clientes en el CRM: oportunidades abiertas y ventas ganadas.</p>
      <form className="flex flex-wrap items-end gap-2" aria-label="Fechas">
        <input type="hidden" name="tab" value="anuncios" />
        <label className="grid gap-1 text-xs text-fg-muted">Desde<Input type="date" name="desde" defaultValue={d.from} max={d.to} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Hasta<Input type="date" name="hasta" defaultValue={d.to} min={d.from} /></label>
        <Button type="submit" variant="secondary">Ver</Button>
      </form>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["Chats por anuncios", String(d.total.chats)], ["Citas", `${d.total.appointments} (${pct(d.total.appointments, d.total.customers)})`], ["Ventas ganadas", `${d.total.won} (${pct(d.total.won, d.total.customers)})`], ["Valor ganado", cop(d.total.value)]] as const).map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs text-fg-muted">{l}</p><p className="mt-1 text-xl font-semibold tabular-nums">{v}</p></Card>
        ))}
      </div>
      {d.rows.length === 0 ? (
        <Card className="grid gap-4 pb-6">
          <EmptyState icon={Megaphone} title="Aún no hay chats por anuncios en estas fechas" description="Cuando alguien te escriba desde un anuncio de Meta con botón de mensaje o de WhatsApp, Nexora guarda de qué anuncio llegó y aquí ves cuántas ventas trajo." />
          <DemoControls hasDemo={false} />
        </Card>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {d.rows.map((r) => (
              <li key={r.adId}>
                <Card className="grid gap-2 p-4 text-sm">
                  <p className="font-medium">{r.title ?? `Anuncio ${r.adId}`}</p>
                  <p className="text-xs text-fg-subtle">{r.channels.map((c) => CHANNEL_LABEL[c]).join(", ")} · {r.sourceType === "post" ? "Publicación" : "Anuncio"} {r.adId}</p>
                  <dl className="grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-lg bg-bg-subtle p-2"><dt className="text-[11px] text-fg-muted">Chats</dt><dd className="font-semibold">{r.chats}</dd></div>
                    <div className="rounded-lg bg-bg-subtle p-2"><dt className="text-[11px] text-fg-muted">Citas</dt><dd className="font-semibold">{r.appointments}</dd></div>
                    <div className="rounded-lg bg-bg-subtle p-2"><dt className="text-[11px] text-fg-muted">Ventas</dt><dd className="font-semibold">{r.won}</dd></div>
                    <div className="rounded-lg bg-bg-subtle p-2"><dt className="text-[11px] text-fg-muted">Valor</dt><dd className="font-semibold">{cop(r.value)}</dd></div>
                  </dl>
                  <Link href={`/admin/crm/mensajes?anuncio=${encodeURIComponent(r.adId)}`} className="text-xs text-primary hover:underline">Ver sus chats</Link>
                </Card>
              </li>
            ))}
          </ul>
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle text-left text-xs text-fg-muted">
                <tr><th className="px-4 py-2 font-medium">Anuncio</th><th className="px-3 py-2 font-medium">Canal</th><th className="px-3 py-2 text-right font-medium">Chats</th><th className="px-3 py-2 text-right font-medium">Clientes</th><th className="px-3 py-2 text-right font-medium">Citas</th><th className="px-3 py-2 text-right font-medium">En curso</th><th className="px-3 py-2 text-right font-medium">Ventas</th><th className="px-3 py-2 text-right font-medium">Conversión</th><th className="px-4 py-2 text-right font-medium">Valor ganado</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.rows.map((r) => (
                  <tr key={r.adId}>
                    <td className="px-4 py-3"><Link href={`/admin/crm/mensajes?anuncio=${encodeURIComponent(r.adId)}`} className="font-medium hover:underline">{r.title ?? `Anuncio ${r.adId}`}</Link><span className="block text-xs text-fg-subtle">{r.sourceType === "post" ? "Publicación" : "Anuncio"} {r.adId}</span></td>
                    <td className="px-3 py-3 text-fg-muted">{r.channels.map((c) => CHANNEL_LABEL[c]).join(", ")}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.chats}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.customers}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.appointments}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.open}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.won}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{pct(r.won, r.customers)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{cop(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
