import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { analyzeConversation } from "@/server/crm-ai";
import { createAppointment, handleBookingAction, offerDays } from "@/server/booking";
import { AppError, notFound } from "@/server/errors";
import { recordInbound, type AdReferral, type Channel } from "@/server/messages";
import { ingestComment, suggestCommentReply } from "@/server/social-comments";
import type { Actor } from "@/server/sessions";

/**
 * Demostración de la bandeja de mensajes: carga chats de WhatsApp, Messenger e
 * Instagram (varios llegados por anuncios), comentarios de redes y el análisis
 * de la IA, para mostrar el CRM sin conectar nada. Lo de demostración nunca
 * sale a una plataforma (queda como entregado) y se borra con un botón.
 * Sin llave de Claude, la IA de la demostración usa reglas simples; con
 * llave, responde la IA real.
 */

export const DEMO_SOURCE = "DEMO";

type DemoMsg = [dir: "IN" | "OUT", minutesAgo: number, body: string, origin?: "NEXORA" | "AI"];
type DemoChat = { channel: Channel; user: string; name: string; ad?: AdReferral; messages: DemoMsg[]; won?: number };

const ADS = {
  promo: { id: "120210000000000001", title: "Promo de temporada · 20 % de descuento", url: "https://www.facebook.com/ads/library/?id=120210000000000001", sourceType: "ad" },
  nueva: { id: "120210000000000002", title: "Nueva colección · Escríbenos por WhatsApp", url: "https://www.instagram.com/p/demo-coleccion/", sourceType: "ad" },
  domicilios: { id: "120210000000000003", title: "Domicilios gratis este fin de semana", url: "https://www.facebook.com/ads/library/?id=120210000000000003", sourceType: "ad" },
} satisfies Record<string, AdReferral>;

const CHATS: DemoChat[] = [
  { channel: "WHATSAPP", user: "573009990101", name: "Laura Gómez", ad: ADS.promo, won: 380000, messages: [
    ["IN", 340, "Hola! Vi el anuncio de la promo del 20 %, ¿todavía aplica?"],
    ["OUT", 335, "¡Hola, Laura! Sí, aplica hasta el domingo 😊 ¿Qué producto te interesa?", "AI"],
    ["IN", 330, "El combo familiar, ¿cuánto vale con el descuento?"],
    ["OUT", 320, "El combo familiar queda en $304.000 con el descuento. ¿Te lo apartamos?", "NEXORA"],
    ["IN", 300, "Sí, porfa. Ya les hice la transferencia por Nequi, les mando el comprobante"],
  ] },
  { channel: "WHATSAPP", user: "573009990102", name: "Andrés Rojas", ad: ADS.nueva, messages: [
    ["IN", 45, "Buenas, ¿cuánto vale lo de la nueva colección que salió en Instagram?"],
  ] },
  { channel: "INSTAGRAM", user: "demo-ig-1", name: "@valen.moda", ad: ADS.nueva, messages: [
    ["IN", 25, "Holaa, me encantó lo del anuncio 😍 ¿abren los domingos? quiero agendar una visita"],
  ] },
  { channel: "MESSENGER", user: "demo-fb-1", name: "Carlos Pérez", messages: [
    ["IN", 1600, "Buenas tardes, hice un pedido hace 5 días y no me ha llegado"],
    ["OUT", 1590, "Hola, Carlos. Lamento la demora; ya reviso tu pedido.", "NEXORA"],
    ["IN", 12, "Sigo esperando, es el peor servicio, quiero la devolución de mi plata"],
  ] },
  { channel: "WHATSAPP", user: "573009990103", name: "Natalia Ruiz", ad: ADS.domicilios, won: 125000, messages: [
    ["IN", 2900, "Hola, ¿el domicilio gratis aplica para el barrio La Esperanza?"],
    ["OUT", 2895, "¡Hola, Natalia! Sí aplica 😊 ¿Qué te enviamos?", "AI"],
    ["IN", 2890, "Quiero pedir dos de los clásicos para hoy"],
    ["OUT", 2880, "¡Listo! Tu pedido sale en 40 minutos. ¡Gracias por comprarnos!", "NEXORA"],
  ] },
  { channel: "WHATSAPP", user: "573009990104", name: "Jorge Medina", messages: [
    ["IN", 8, "Buenos días, ¿me regalan información para hacer un pedido a domicilio?"],
  ] },
];

const COMMENTS = [
  { channel: "INSTAGRAM" as const, id: "demo-c1", author: "@sofi.rz", authorId: "demo-ig-c1", body: "Precio por DM porfa 🙏", post: "Nueva colección ya disponible ✨", minutes: 30 },
  { channel: "FACEBOOK" as const, id: "demo-c2", author: "Marta Lucía Díaz", authorId: "demo-fb-c2", body: "¿Hacen envíos a Acacías? Me interesa", post: "Domicilios gratis este fin de semana 🛵", minutes: 95 },
  { channel: "INSTAGRAM" as const, id: "demo-c3", author: "@camilo_88", authorId: "demo-ig-c3", body: "Qué belleza 😍🔥", post: "Nueva colección ya disponible ✨", minutes: 180 },
  { channel: "FACEBOOK" as const, id: "demo-c4", author: "Pedro Castaño", authorId: "demo-fb-c4", body: "Pésimo, pedí hace una semana y nada que me responden", post: "Promo de temporada · 20 % de descuento", minutes: 400 },
];

export async function hasDemo(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return (await db.conversation.count({ where: { companyId, demo: true } })) > 0;
}

/** Carga la demostración (si ya está, la vuelve a cargar desde cero). */
export async function loadDemo(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  await clearDemo(actor);
  const startedAt = new Date();
  const conversationIds: string[] = [];
  for (const [ci, chat] of CHATS.entries()) {
    let conversationId: string | null = null;
    for (const [mi, [dir, ago, body, origin]] of chat.messages.entries()) {
      const at = new Date(now.getTime() - ago * 60_000);
      if (dir === "IN") {
        const r = await recordInbound(companyId, {
          channel: chat.channel, externalUser: chat.user, name: chat.name, body, externalId: `demo:${companyId}:${ci}:${mi}`, at,
          ad: mi === 0 ? chat.ad ?? null : null, demo: true,
        });
        if (!r.duplicate) conversationId = r.conversationId;
      } else if (conversationId) {
        await db.message.create({ data: { companyId, conversationId, direction: "OUT", body, status: "READ", origin: origin ?? "NEXORA", sentById: origin === "AI" ? null : actor.userId, createdAt: at } });
        await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: at, lastPreview: body.slice(0, 120) } });
      }
    }
    if (!conversationId) continue;
    conversationIds.push(conversationId);
    const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId }, select: { customerId: true } });
    // Solo se marca (y luego se borra) el cliente si lo creó la demostración, nunca uno real con el mismo número.
    await db.customer.updateMany({ where: { id: conv.customerId, createdAt: { gte: startedAt } }, data: { source: DEMO_SOURCE } });
    if (chat.won) {
      await db.deal.updateMany({ where: { companyId, customerId: conv.customerId, customer: { source: DEMO_SOURCE } }, data: { stage: "WON", value: chat.won, closedAt: now } });
    }
    // Lo que ya se respondió queda leído.
    if (chat.messages.at(-1)![0] === "OUT") await db.conversation.update({ where: { id: conversationId }, data: { unread: 0 } });
  }
  // La IA analiza los chats que esperan respuesta (en la demostración nunca envía sola al cargar).
  for (const id of conversationIds) await analyzeConversation(companyId, id, { force: true, allowAutoSend: false }, undefined, now).catch(() => null);
  // Agenda: @valen.moda quiere una cita → la IA le ofreció los días con botones; Natalia ya vino.
  const byName = async (name: string) => db.conversation.findFirst({ where: { companyId, demo: true, customer: { name } } });
  const valen = await byName("@valen.moda");
  if (valen) await offerDays(valen, { origin: "AI", userId: null }, "¡Hola! Claro que sí 😊", now).catch(() => null);
  const natalia = await byName("Natalia Ruiz");
  if (natalia) {
    const { appointment } = await createAppointment(companyId, { customerId: natalia.customerId, startsAt: new Date(now.getTime() - 26 * 3_600_000), conversationId: natalia.id, source: "CHAT" });
    await db.appointment.update({ where: { id: appointment.id }, data: { status: "ATTENDED" } });
  }
  for (const c of COMMENTS) {
    const id = await ingestComment(companyId, {
      channel: c.channel, externalId: `${c.id}:${companyId}`, authorId: c.authorId, authorName: c.author, body: c.body, postText: c.post,
      at: new Date(now.getTime() - c.minutes * 60_000), demo: true,
    });
    if (id) await suggestCommentReply(companyId, id).catch(() => null);
  }
  await audit({ companyId, actorUserId: actor.userId, action: "crm.demo_load", entityType: "company", entityId: companyId, after: { chats: conversationIds.length, comments: COMMENTS.length } });
  return { chats: conversationIds.length, comments: COMMENTS.length };
}

/** Borra todo lo de demostración (chats, mensajes, comentarios y los clientes y oportunidades que creó). */
export async function clearDemo(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const convs = await db.conversation.findMany({ where: { companyId, demo: true }, select: { id: true, customerId: true } });
  const customerIds = [...new Set(convs.map((c) => c.customerId))];
  await db.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { companyId, conversationId: { in: convs.map((c) => c.id) } } });
    await tx.appointment.deleteMany({ where: { companyId, conversationId: { in: convs.map((c) => c.id) } } });
    await tx.conversation.deleteMany({ where: { companyId, demo: true } });
    await tx.socialComment.deleteMany({ where: { companyId, demo: true } });
    // Solo los clientes creados por la demostración (y sin ventas ni otros chats).
    const demoCustomers = await tx.customer.findMany({ where: { companyId, id: { in: customerIds }, source: DEMO_SOURCE, sales: { none: {} }, conversations: { none: {} } }, select: { id: true } });
    const ids = demoCustomers.map((c) => c.id);
    await tx.appointment.deleteMany({ where: { companyId, customerId: { in: ids } } });
    await tx.crmActivity.deleteMany({ where: { companyId, customerId: { in: ids } } });
    await tx.deal.deleteMany({ where: { companyId, customerId: { in: ids } } });
    await tx.customer.deleteMany({ where: { companyId, id: { in: ids } } });
  });
  if (convs.length) await audit({ companyId, actorUserId: actor.userId, action: "crm.demo_clear", entityType: "company", entityId: companyId, after: { chats: convs.length } });
}

const simSchema = z.string().trim().min(1, { error: "Escribe el mensaje del cliente." }).max(1000);

/**
 * Solo en chats de demostración: escribe como si fuera el cliente, para ver a
 * la IA trabajar (sugerir o, con la respuesta automática encendida, responder sola).
 */
export async function simulateCustomer(actor: Actor, conversationId: string, raw: unknown, now = new Date(), action?: string) {
  const companyId = requireCompanyAdmin(actor);
  const t = simSchema.safeParse(raw);
  if (!t.success) throw new AppError("VALIDATION", t.error.issues[0]!.message);
  if (!z.uuid().safeParse(conversationId).success) throw notFound("La conversación");
  const c = await db.conversation.findFirst({ where: { id: conversationId, companyId } });
  if (!c) throw notFound("La conversación");
  if (!c.demo) throw new AppError("FORBIDDEN", "Solo se puede simular en los chats de demostración.");
  await recordInbound(companyId, { channel: c.channel as Channel, externalUser: c.externalUser, body: t.data, kind: action ? "button" : "text", externalId: `demo:${crypto.randomUUID()}`, at: now, demo: true });
  // Tocó un botón de la agenda (como lo haría en WhatsApp): lo responde la agenda.
  if (action && /^ag_[a-z0-9_:.TZ-]{0,60}$/i.test(action) && (await handleBookingAction(companyId, c.id, action, new Date(now.getTime() + 1)))) return { booking: true as const };
  // Un instante después: la respuesta de la IA queda después del mensaje del cliente.
  return analyzeConversation(companyId, c.id, { force: true, allowAutoSend: true }, undefined, new Date(now.getTime() + 1));
}
