import "server-only";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { normalizePhone, OPEN_STAGES } from "@/server/crm";
import { AppError, notFound } from "@/server/errors";
import { integrationCredentials } from "@/server/integrations";
import type { Actor } from "@/server/sessions";

/**
 * Bandeja de mensajes del CRM: conversaciones de WhatsApp, Messenger e
 * Instagram por cliente. Los entrantes llegan por los webhooks; las
 * respuestas salen por la API oficial de cada canal con los tokens de la
 * empresa. Meta solo permite responder libremente dentro de las 24 h
 * siguientes al último mensaje del cliente.
 */

export type Channel = "WHATSAPP" | "MESSENGER" | "INSTAGRAM";
export const CHANNEL_LABEL: Record<Channel, string> = { WHATSAPP: "WhatsApp", MESSENGER: "Messenger", INSTAGRAM: "Instagram" };
const META_VERSION = "v21.0";
export const REPLY_WINDOW_MS = 24 * 3_600_000;
const SOURCE: Record<Channel, string> = { WHATSAPP: "WHATSAPP", MESSENGER: "META", INSTAGRAM: "META" };
const preview = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}…` : s);

/** Anuncio o publicación de Meta desde donde el cliente tocó «Enviar mensaje». */
export type AdReferral = { id: string; title?: string | null; url?: string | null; sourceType?: string | null };
type Inbound = { channel: Channel; externalUser: string; name?: string | null; body: string; kind?: string; externalId: string; at?: Date; ad?: AdReferral | null; demo?: boolean };
const adData = (ad: AdReferral, at: Date) => ({
  adId: ad.id.slice(0, 64), adTitle: ad.title?.trim().slice(0, 300) || null, adUrl: ad.url?.trim().slice(0, 500) || null,
  adSourceType: ad.sourceType === "post" ? "post" : "ad", adAt: at,
});

/**
 * Guarda un mensaje entrante (una sola vez por id externo). La primera vez
 * crea o reconoce al cliente (en WhatsApp por su celular), abre una
 * oportunidad si no tiene una abierta y deja el aviso en su historial.
 */
export async function recordInbound(companyId: string, m: Inbound) {
  const at = m.at ?? new Date();
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`conv:${companyId}:${m.channel}:${m.externalUser}`}))`;
      if (await tx.message.findFirst({ where: { companyId, externalId: m.externalId }, select: { id: true } })) return { duplicate: true as const };
      let conv = await tx.conversation.findFirst({ where: { companyId, channel: m.channel, externalUser: m.externalUser } });
      let isNew = false;
      if (!conv) {
        isNew = true;
        const phone = m.channel === "WHATSAPP" ? normalizePhone(m.externalUser) : null;
        let customer = phone ? await tx.customer.findFirst({ where: { companyId, phone }, orderBy: { createdAt: "asc" } }) : null;
        customer ??= await tx.customer.create({
          data: { companyId, name: m.name?.trim() || (phone ? `Cliente ${phone}` : `Cliente de ${CHANNEL_LABEL[m.channel]}`), phone, source: SOURCE[m.channel] },
        });
        let deal = await tx.deal.findFirst({ where: { companyId, customerId: customer.id, stage: { in: OPEN_STAGES } } });
        const adLabel = m.ad ? ` · anuncio «${m.ad.title?.trim() || m.ad.id}»` : "";
        deal ??= await tx.deal.create({ data: { companyId, customerId: customer.id, title: m.ad ? `Anuncio: ${(m.ad.title?.trim() || m.ad.id).slice(0, 120)}` : `Conversación por ${CHANNEL_LABEL[m.channel]}`, source: SOURCE[m.channel] } });
        await tx.crmActivity.create({ data: { companyId, customerId: customer.id, dealId: deal.id, type: "LEAD", body: `Nuevo contacto por ${CHANNEL_LABEL[m.channel]}${adLabel}: ${preview(m.body)}` } });
        conv = await tx.conversation.create({ data: { companyId, customerId: customer.id, channel: m.channel, externalUser: m.externalUser, lastMessageAt: at, demo: m.demo ?? false, ...(m.ad ? adData(m.ad, at) : {}) } });
      } else if (m.ad) {
        // Volvió a escribir desde otro anuncio: queda el más reciente.
        await tx.conversation.update({ where: { id: conv.id }, data: adData(m.ad, at) });
      }
      const msg = await tx.message.create({ data: { companyId, conversationId: conv.id, direction: "IN", body: m.body, kind: m.kind ?? "text", status: "RECEIVED", externalId: m.externalId, createdAt: at } });
      await tx.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: at, lastInboundAt: at, lastPreview: preview(m.body), unread: { increment: 1 } } });
      return { duplicate: false as const, conversationId: conv.id, messageId: msg.id, newConversation: isNew };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { duplicate: true as const };
    throw e;
  }
}

/** Mensaje que la empresa envió desde la app de la plataforma (p. ej. Meta Business Suite): se muestra también aquí. */
export async function recordEcho(companyId: string, m: Omit<Inbound, "name">) {
  const conv = await db.conversation.findFirst({ where: { companyId, channel: m.channel, externalUser: m.externalUser } });
  if (!conv) return;
  try {
    await db.$transaction([
      db.message.create({ data: { companyId, conversationId: conv.id, direction: "OUT", body: m.body, kind: m.kind ?? "text", status: "SENT", origin: "PHONE", externalId: m.externalId, createdAt: m.at ?? new Date() } }),
      db.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: m.at ?? new Date(), lastPreview: preview(m.body) } }),
    ]);
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e; // ya estaba (lo enviamos desde Nexora)
  }
}

const STATUS_RANK = { RECEIVED: 0, FAILED: 0, SENT: 1, DELIVERED: 2, READ: 3 } as const;

/** Estado de un mensaje enviado (WhatsApp avisa enviado, entregado, leído o fallido). Nunca retrocede. */
export async function updateMessageStatus(companyId: string, externalId: string, status: "SENT" | "DELIVERED" | "READ" | "FAILED", error?: string) {
  const m = await db.message.findFirst({ where: { companyId, externalId, direction: "OUT" } });
  if (!m) return;
  if (status !== "FAILED" && STATUS_RANK[status] <= STATUS_RANK[m.status]) return;
  await db.message.update({ where: { id: m.id }, data: { status, error: status === "FAILED" ? (error ?? "No se pudo entregar").slice(0, 300) : null } });
}

// ───────────────────────────── Pantalla ─────────────────────────────

const listSchema = z.object({
  canal: z.enum(["WHATSAPP", "MESSENGER", "INSTAGRAM"]).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  /** atender (piden una persona), sin_leer, anuncios (llegaron por un anuncio) */
  ver: z.enum(["atender", "sin_leer", "anuncios"]).optional().catch(undefined),
  anuncio: z.string().trim().max(64).optional().catch(undefined),
});

export async function listConversations(actor: Actor, raw: Record<string, unknown> = {}) {
  const companyId = requireCompanyAdmin(actor);
  const f = listSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v ? v : undefined])));
  const rows = await db.conversation.findMany({
    where: {
      companyId,
      ...(f.canal ? { channel: f.canal } : {}),
      ...(f.q ? { OR: [{ customer: { name: { contains: f.q, mode: "insensitive" } } }, { customer: { phone: { contains: f.q } } }] } : {}),
      ...(f.ver === "atender" ? { needsHuman: true } : f.ver === "sin_leer" ? { unread: { gt: 0 } } : f.ver === "anuncios" ? { adId: { not: null } } : {}),
      ...(f.anuncio ? { adId: f.anuncio } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: { customer: { select: { name: true } } },
  });
  return {
    filters: f,
    conversations: rows.map((c) => ({
      id: c.id, channel: c.channel as Channel, customer: c.customer.name, customerId: c.customerId, preview: c.lastPreview, at: c.lastMessageAt, unread: c.unread,
      needsHuman: c.needsHuman, aiTag: c.aiTag, aiPaused: c.aiPaused, demo: c.demo,
      ad: c.adId ? { id: c.adId, title: c.adTitle, sourceType: c.adSourceType } : null,
    })),
    unread: rows.reduce((a, c) => a + c.unread, 0),
  };
}

/** Conversación con sus mensajes; al abrirla se marca como leída. */
export async function getConversation(actor: Actor, id: string, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La conversación");
  const c = await db.conversation.findFirst({ where: { id, companyId }, include: { customer: { select: { id: true, name: true, phone: true } } } });
  if (!c) throw notFound("La conversación");
  const messages = await db.message.findMany({ where: { conversationId: id, companyId }, orderBy: { createdAt: "desc" }, take: 200, include: { sentBy: { select: { name: true } } } });
  if (c.unread > 0) await db.conversation.update({ where: { id }, data: { unread: 0 } });
  const windowEndsAt = c.lastInboundAt ? new Date(c.lastInboundAt.getTime() + REPLY_WINDOW_MS) : null;
  return {
    id: c.id, channel: c.channel as Channel, customer: c.customer, externalUser: c.externalUser,
    canReply: !!windowEndsAt && windowEndsAt > now, windowEndsAt, demo: c.demo,
    ad: c.adId ? { id: c.adId, title: c.adTitle, url: c.adUrl, sourceType: c.adSourceType, at: c.adAt } : null,
    ai: { tag: c.aiTag, summary: c.aiSummary, suggestion: c.aiSuggestion, needsHuman: c.needsHuman, humanReason: c.humanReason, at: c.aiAt, error: c.aiError, paused: c.aiPaused },
    messages: messages.reverse().map((m) => ({ id: m.id, direction: m.direction, origin: m.origin, body: m.body, kind: m.kind, status: m.status, error: m.error, at: m.createdAt, by: m.sentBy?.name ?? null, buttons: Array.isArray(m.buttons) ? (m.buttons as ReplyButton[]) : null })),
  };
}

// ───────────────────────────── Responder ─────────────────────────────

const replySchema = z.string().trim().min(1, { error: "Escribe el mensaje." }).max(2000, { error: "Máximo 2.000 caracteres." });

/** Botón de respuesta: id (lo que vuelve cuando el cliente lo toca) y el texto que ve. */
export type ReplyButton = { id: string; title: string };

/**
 * Cuerpo de WhatsApp: hasta 3 opciones como botones (título de 20 caracteres);
 * más de 3, como lista (hasta 10 filas de 24 caracteres).
 */
export function whatsappInteractive(text: string, buttons: ReplyButton[]) {
  if (buttons.length <= 3) {
    return { type: "button", body: { text: text.slice(0, 1024) }, action: { buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })) } };
  }
  return {
    type: "list", body: { text: text.slice(0, 1024) },
    action: { button: "Ver opciones", sections: [{ title: "Elige una", rows: buttons.slice(0, 10).map((b) => ({ id: b.id.slice(0, 200), title: b.title.slice(0, 24) })) }] },
  };
}

async function sendViaApi(companyId: string, channel: Channel, to: string, text: string, f: typeof fetch, buttons?: ReplyButton[]) {
  if (channel === "WHATSAPP") {
    const c = await integrationCredentials(companyId, "WHATSAPP");
    if (!c?.secrets.accessToken) throw new AppError("CONFLICT", "Conecta WhatsApp en Integraciones para responder desde aquí.");
    const r = await f(`https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(c.config.phoneNumberId!)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.secrets.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(buttons?.length
        ? { messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive", interactive: whatsappInteractive(text, buttons) }
        : { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text, preview_url: false } }),
      signal: AbortSignal.timeout(15_000),
    });
    const d = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    return r.ok && d.messages?.[0]?.id ? { id: d.messages[0].id } : { error: d.error?.message ?? `Error ${r.status}` };
  }
  const c = await integrationCredentials(companyId, "META");
  if (!c?.secrets.pageAccessToken) throw new AppError("CONFLICT", "Conecta Facebook e Instagram en Integraciones para responder desde aquí.");
  const r = await f(`https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(c.config.pageId!)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.secrets.pageAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: to }, messaging_type: "RESPONSE",
      // Messenger e Instagram: respuestas rápidas (hasta 13, título de 20 caracteres).
      message: buttons?.length ? { text, quick_replies: buttons.slice(0, 13).map((b) => ({ content_type: "text", title: b.title.slice(0, 20), payload: b.id })) } : { text },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const d = (await r.json().catch(() => ({}))) as { message_id?: string; error?: { message?: string } };
  // Mismo formato que el «eco» que Meta envía de vuelta, para no mostrarlo dos veces.
  return r.ok && d.message_id ? { id: `${channel.toLowerCase()}:${d.message_id}` } : { error: d.error?.message ?? `Error ${r.status}` };
}

type ConversationRow = { id: string; companyId: string; channel: string; externalUser: string; lastInboundAt: Date | null; demo?: boolean };

/**
 * Envía un texto a la conversación por la API del canal y lo guarda (enviado o
 * fallido). Lo usan las personas (sendReply) y la IA cuando responde sola.
 */
export async function sendToConversation(c: ConversationRow, text: string, by: { origin: "NEXORA" | "AI"; userId: string | null }, f: typeof fetch = fetch, now = new Date(), buttons?: ReplyButton[]) {
  if (!c.lastInboundAt || now.getTime() - c.lastInboundAt.getTime() > REPLY_WINDOW_MS) {
    throw new AppError("CONFLICT", "Pasaron más de 24 horas desde el último mensaje del cliente: Meta no permite responder con texto libre. Usa una plantilla aprobada para retomar la conversación.");
  }
  let result: { id: string } | { error: string };
  if (c.demo) {
    // Chat de demostración: no sale a ninguna plataforma; queda como entregado.
    result = { id: `demo:${crypto.randomUUID()}` };
  } else {
    try {
      result = await sendViaApi(c.companyId, c.channel as Channel, c.externalUser, text, f, buttons);
    } catch (e) {
      if (e instanceof AppError) throw e;
      result = { error: "No se pudo conectar con la plataforma. Intenta de nuevo." };
    }
  }
  const externalId = "id" in result ? result.id : null;
  const failure = "error" in result ? result.error : null;
  const ok = externalId != null;
  const msg = await db.$transaction(async (tx) => {
    const m = await tx.message.create({
      data: { companyId: c.companyId, conversationId: c.id, direction: "OUT", body: text, kind: buttons?.length ? "interactive" : "text", ...(buttons?.length ? { buttons } : {}), status: ok ? (c.demo ? "DELIVERED" : "SENT") : "FAILED", origin: by.origin, error: failure?.slice(0, 300) ?? null, externalId, sentById: by.userId, createdAt: now },
    });
    if (ok) await tx.conversation.update({ where: { id: c.id }, data: { lastMessageAt: now, lastPreview: preview(text), ...(by.origin === "NEXORA" ? { aiSuggestion: null } : {}) } });
    await audit({ companyId: c.companyId, actorUserId: by.userId, action: ok ? (by.origin === "AI" ? "message.ai_send" : "message.send") : "message.fail", entityType: "conversation", entityId: c.id, after: { channel: c.channel, length: text.length } }, tx);
    return m;
  });
  if (!ok) throw new AppError("CONFLICT", `${CHANNEL_LABEL[c.channel as Channel]} no aceptó el mensaje: ${failure}`);
  return { id: msg.id };
}

/** Responde desde Nexora (una persona). Fuera de la ventana de 24 h hace falta una plantilla. */
export async function sendReply(actor: Actor, conversationId: string, rawText: unknown, f: typeof fetch = fetch, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const t = replySchema.safeParse(rawText);
  if (!t.success) throw new AppError("VALIDATION", t.error.issues[0]!.message, { text: t.error.issues[0]!.message });
  if (!z.uuid().safeParse(conversationId).success) throw notFound("La conversación");
  const c = await db.conversation.findFirst({ where: { id: conversationId, companyId } });
  if (!c) throw notFound("La conversación");
  return sendToConversation(c, t.data, { origin: "NEXORA", userId: actor.userId }, f, now);
}

/** «✓ Marcar resuelto»: la persona ya atendió lo que pedía el chat. */
export async function resolveHuman(actor: Actor, conversationId: string) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(conversationId).success) throw notFound("La conversación");
  const r = await db.conversation.updateMany({ where: { id: conversationId, companyId }, data: { needsHuman: false, humanReason: null } });
  if (!r.count) throw notFound("La conversación");
  await audit({ companyId, actorUserId: actor.userId, action: "conversation.resolved", entityType: "conversation", entityId: conversationId });
}

/** Avisos de la bandeja: chats sin leer, que piden una persona y los que llegaron hoy por anuncios. */
export async function inboxAlerts(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const startOfDay = new Date(`${now.toLocaleDateString("en-CA", { timeZone: "America/Bogota" })}T00:00:00-05:00`);
  const [unread, needsHuman, adsToday, latestAd, gaps, comments, appointmentsToday] = await Promise.all([
    db.conversation.count({ where: { companyId, unread: { gt: 0 } } }),
    db.conversation.count({ where: { companyId, needsHuman: true } }),
    db.conversation.count({ where: { companyId, adAt: { gte: startOfDay } } }),
    db.conversation.findFirst({ where: { companyId, adAt: { gte: startOfDay } }, orderBy: { adAt: "desc" }, select: { id: true, adTitle: true, adId: true, channel: true, customer: { select: { name: true } } } }),
    db.aiGap.count({ where: { companyId, status: "PENDING" } }),
    db.socialComment.count({ where: { companyId, status: "PENDING" } }),
    db.appointment.count({ where: { companyId, createdAt: { gte: startOfDay }, source: { in: ["CHAT", "AI"] } } }),
  ]);
  return { unread, needsHuman, adsToday, latestAd, gaps, comments, appointmentsToday };
}

/**
 * Efectividad de los anuncios: chats que llegaron por cada anuncio y qué pasó
 * después con esos clientes en el CRM (oportunidades ganadas y su valor).
 */
export async function adsReport(actor: Actor, raw: { desde?: string; hasta?: string } = {}, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const to = iso.safeParse(raw.hasta).success ? raw.hasta! : today;
  const from = iso.safeParse(raw.desde).success ? raw.desde! : new Date(now.getTime() - 30 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const convs = await db.conversation.findMany({
    where: { companyId, adId: { not: null }, adAt: { gte: new Date(`${from}T00:00:00-05:00`), lte: new Date(`${to}T23:59:59.999-05:00`) } },
    select: { adId: true, adTitle: true, adSourceType: true, channel: true, customerId: true, needsHuman: true },
  });
  const customers = [...new Set(convs.map((c) => c.customerId))];
  const deals = customers.length ? await db.deal.findMany({ where: { companyId, customerId: { in: customers } }, select: { customerId: true, stage: true, value: true } }) : [];
  const appts = customers.length ? await db.appointment.groupBy({ by: ["customerId"], where: { companyId, customerId: { in: customers }, status: { not: "CANCELLED" } }, _count: { _all: true } }) : [];
  const apptsBy = new Map(appts.map((a) => [a.customerId, a._count._all]));
  const byCustomer = new Map<string, { won: number; value: number; open: number }>();
  for (const d of deals) {
    const x = byCustomer.get(d.customerId) ?? { won: 0, value: 0, open: 0 };
    if (d.stage === "WON") { x.won += 1; x.value += Number(d.value ?? 0); } else if (d.stage !== "LOST") x.open += 1;
    byCustomer.set(d.customerId, x);
  }
  const rows = new Map<string, { adId: string; title: string | null; sourceType: string | null; channels: Set<string>; chats: number; customers: Set<string>; open: number; won: number; value: number; appointments: number }>();
  for (const c of convs) {
    const r = rows.get(c.adId!) ?? { adId: c.adId!, title: c.adTitle, sourceType: c.adSourceType, channels: new Set(), chats: 0, customers: new Set(), open: 0, won: 0, value: 0, appointments: 0 };
    r.chats += 1;
    r.channels.add(c.channel);
    r.title ??= c.adTitle;
    if (!r.customers.has(c.customerId)) {
      r.customers.add(c.customerId);
      r.appointments += apptsBy.get(c.customerId) ?? 0;
      const d = byCustomer.get(c.customerId);
      if (d) { r.open += d.open; r.won += d.won; r.value += d.value; }
    }
    rows.set(c.adId!, r);
  }
  const list = [...rows.values()].map((r) => ({ adId: r.adId, title: r.title, sourceType: r.sourceType, channels: [...r.channels] as Channel[], chats: r.chats, customers: r.customers.size, appointments: r.appointments, open: r.open, won: r.won, value: r.value })).sort((a, b) => b.chats - a.chats);
  const total = list.reduce((a, r) => ({ chats: a.chats + r.chats, customers: a.customers + r.customers, appointments: a.appointments + r.appointments, won: a.won + r.won, value: a.value + r.value }), { chats: 0, customers: 0, appointments: 0, won: 0, value: 0 });
  return { from, to, rows: list, total };
}
