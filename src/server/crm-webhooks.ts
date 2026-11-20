import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import { ingestLead, leadSchema } from "@/server/crm";
import { integrationCredentials } from "@/server/integrations";
import { recordEcho, recordInbound, updateMessageStatus, type AdReferral, type Channel } from "@/server/messages";
import { ingestComment } from "@/server/social-comments";
import { templateStatusFromWebhook } from "@/server/wa-templates";

/**
 * Avisos (webhooks) que crean leads en el CRM de UNA empresa. Cada empresa
 * tiene su propia dirección: /api/webhooks/<proveedor>/<token privado de su
 * integración>. Con Meta y WhatsApp, además, se verifica la firma
 * X-Hub-Signature-256 con la clave secreta de la app de la empresa.
 */

const META_VERSION = "v21.0";
/** «analyze»: conversaciones con mensajes nuevos que la IA debe leer después de responder el aviso. */
export type WebhookResult = { status: number; body: string; contentType?: string; analyze?: { companyId: string; conversationIds: string[]; commentIds?: string[] } };
const ok = (body = "ok"): WebhookResult => ({ status: 200, body });
const fail = (status: number, body: string): WebhookResult => ({ status, body });
const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

async function integrationByToken(provider: string, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const row = await db.integration.findFirst({ where: { webhookToken: token, provider, companyId: { not: null } }, select: { companyId: true } });
  if (!row?.companyId) return null;
  const creds = await integrationCredentials(row.companyId, provider);
  return creds ? { companyId: row.companyId, ...creds } : null;
}

/** Firma de Meta: HMAC-SHA256 del cuerpo exacto con la clave secreta de la app. */
export function validMetaSignature(rawBody: string, header: string | null, appSecret: string | undefined) {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"));
  const got = Buffer.from(header.slice(7));
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Verificación de la suscripción (GET): Meta envía hub.verify_token, que debe ser el token privado. */
export async function verifySubscription(provider: "META" | "WHATSAPP", token: string, params: URLSearchParams): Promise<WebhookResult> {
  const i = await integrationByToken(provider, token);
  if (!i) return fail(404, "No encontrado");
  if (params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== i.webhookToken) return fail(403, "Token de verificación incorrecto");
  return { status: 200, body: params.get("hub.challenge") ?? "", contentType: "text/plain" };
}

// ───────────────────────────── Meta: formularios de anuncios ─────────────────────────────

/** Anuncio de clic a Messenger/Instagram (referral.source = ADS). */
const metaReferral = z.object({
  source: z.string().optional(),
  ad_id: z.union([z.string(), z.number()]).optional(),
  ads_context_data: z.object({ ad_title: z.string().optional(), photo_url: z.string().optional(), post_id: z.string().optional() }).partial().optional(),
}).passthrough();
const metaMessaging = z.object({
  sender: z.object({ id: z.string() }),
  recipient: z.object({ id: z.string() }),
  timestamp: z.number().optional(),
  referral: metaReferral.optional(),
  message: z.object({ mid: z.string(), text: z.string().optional(), is_echo: z.boolean().optional(), attachments: z.array(z.object({ type: z.string() })).optional(), referral: metaReferral.optional() }).optional(),
});
export function adFromMetaReferral(r: z.infer<typeof metaReferral> | undefined): AdReferral | null {
  if (!r || r.ad_id == null || (r.source && r.source !== "ADS")) return null;
  return { id: String(r.ad_id), title: r.ads_context_data?.ad_title ?? null, url: r.ads_context_data?.photo_url ?? null, sourceType: "ad" };
}
const metaEvent = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string().optional(),
    changes: z.array(z.object({ field: z.string(), value: z.record(z.string(), z.unknown()) })).optional(),
    messaging: z.array(metaMessaging).optional(),
  })).default([]),
});

/** Nombre de la persona en Messenger o Instagram (si la API lo da). */
async function profileName(id: string, channel: Channel, token: string, f: typeof fetch) {
  try {
    const r = await f(`https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(id)}?fields=${channel === "INSTAGRAM" ? "name,username" : "name"}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return null;
    const d = (await r.json()) as { name?: string; username?: string };
    return d.name || (d.username ? `@${d.username}` : null);
  } catch {
    return null;
  }
}

/** Campos del formulario de Meta → datos del lead (nombres en inglés o español). */
export function leadFromMetaFields(fields: { name: string; values?: string[] }[]) {
  const get = (...keys: string[]) => fields.find((f) => keys.includes(f.name.toLowerCase()))?.values?.[0]?.trim();
  const first = get("first_name", "nombre");
  const last = get("last_name", "apellido", "apellidos");
  const known = new Set(["full_name", "nombre_completo", "first_name", "nombre", "last_name", "apellido", "apellidos", "email", "correo", "correo_electrónico", "phone_number", "telefono", "teléfono", "celular"]);
  const extra = fields.filter((f) => !known.has(f.name.toLowerCase()) && f.values?.[0]).map((f) => `${f.name.replace(/_/g, " ")}: ${f.values!.join(", ")}`);
  return {
    name: get("full_name", "nombre_completo") ?? ([first, last].filter(Boolean).join(" ") || undefined),
    email: get("email", "correo", "correo_electrónico"),
    phone: get("phone_number", "telefono", "teléfono", "celular"),
    message: extra.length ? extra.join("\n") : undefined,
  };
}

export async function handleMetaEvent(token: string, rawBody: string, signature: string | null, f: typeof fetch = fetch): Promise<WebhookResult> {
  const i = await integrationByToken("META", token);
  if (!i) return fail(404, "No encontrado");
  if (!validMetaSignature(rawBody, signature, i.secrets.appSecret)) return fail(401, "Firma inválida");
  const parsed = metaEvent.safeParse(parseJson(rawBody));
  if (!parsed.success || (parsed.data.object !== "page" && parsed.data.object !== "instagram")) return ok("ignorado");
  const channel: Channel = parsed.data.object === "instagram" ? "INSTAGRAM" : "MESSENGER";
  const analyze = new Set<string>();

  // Mensajes de Messenger o Instagram → bandeja del CRM.
  for (const ev of parsed.data.entry.flatMap((e) => e.messaging ?? [])) {
    if (!ev.message) continue;
    const body = ev.message.text ?? (ev.message.attachments?.length ? `[${ev.message.attachments.map((a) => a.type).join(", ")}]` : "");
    if (!body) continue;
    const at = ev.timestamp ? new Date(ev.timestamp) : undefined;
    if (ev.message.is_echo) {
      // Lo que el negocio respondió desde Meta Business Suite o la app: se muestra también aquí.
      await recordEcho(i.companyId, { channel, externalUser: ev.recipient.id, body, kind: ev.message.text ? "text" : "attachment", externalId: `${channel.toLowerCase()}:${ev.message.mid}`, at });
      continue;
    }
    const known = await db.conversation.findFirst({ where: { companyId: i.companyId, channel, externalUser: ev.sender.id }, select: { id: true } });
    const name = known ? null : await profileName(ev.sender.id, channel, i.secrets.pageAccessToken!, f);
    const ad = adFromMetaReferral(ev.message.referral ?? ev.referral);
    const r = await recordInbound(i.companyId, { channel, externalUser: ev.sender.id, name, body, kind: ev.message.text ? "text" : "attachment", externalId: `${channel.toLowerCase()}:${ev.message.mid}`, at, ad });
    if (!r.duplicate) analyze.add(r.conversationId);
  }

  // Comentarios en publicaciones y anuncios → «Comentarios de redes» (la IA sugiere la respuesta).
  const commentIds: string[] = [];
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes ?? []) {
      const c = commentFromChange(parsed.data.object, change, entry.id);
      if (!c) continue;
      const id = await ingestComment(i.companyId, c);
      if (id) commentIds.push(id);
    }
  }

  // Formularios de anuncios (leadgen) → cliente y oportunidad.
  for (const change of parsed.data.entry.flatMap((e) => e.changes ?? [])) {
    if (change.field !== "leadgen") continue;
    const leadId = String(change.value.leadgen_id ?? "");
    if (!/^\d{5,30}$/.test(leadId)) continue;
    const r = await f(`https://graph.facebook.com/${META_VERSION}/${leadId}?fields=field_data,ad_name,campaign_name,form_id`, {
      headers: { Authorization: `Bearer ${i.secrets.pageAccessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.error(`Meta lead ${leadId}: ${r.status}`);
      continue;
    }
    const d = (await r.json()) as { field_data?: { name: string; values?: string[] }[]; ad_name?: string; campaign_name?: string };
    const lead = leadFromMetaFields(d.field_data ?? []);
    if (!lead.email && !lead.phone) continue;
    // Quien llena un formulario de anuncio con aviso de privacidad acepta ser contactado sobre esa solicitud.
    await ingestLead(i.companyId, "META", { ...lead, campaign: d.campaign_name ?? d.ad_name, consent: true, externalId: `meta:${leadId}` });
  }
  return { ...ok(), analyze: { companyId: i.companyId, conversationIds: [...analyze], commentIds } };
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : null);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/**
 * Comentario nuevo de Instagram (field «comments») o de la página de Facebook
 * (field «feed», item «comment», verb «add»). Se ignoran los de la propia
 * cuenta (sus respuestas).
 */
export function commentFromChange(object: string, change: { field: string; value: Record<string, unknown> }, ownId?: string) {
  const v = change.value;
  if (object === "instagram" && change.field === "comments") {
    const from = obj(v.from);
    const id = str(v.id);
    const text = str(v.text);
    if (!id || !text || (ownId && str(from.id) === ownId)) return null;
    return {
      channel: "INSTAGRAM" as const, externalId: id, parentId: str(v.parent_id), postId: str(obj(v.media).id),
      authorId: str(from.id), authorName: str(from.username) ? `@${str(from.username)}` : null, body: text,
    };
  }
  if (object === "page" && change.field === "feed" && v.item === "comment" && v.verb === "add") {
    const from = obj(v.from);
    const id = str(v.comment_id);
    const text = str(v.message);
    if (!id || !text || (ownId && str(from.id) === ownId)) return null;
    const created = typeof v.created_time === "number" ? new Date(v.created_time * 1000) : undefined;
    const postId = str(v.post_id);
    return {
      channel: "FACEBOOK" as const, externalId: id, parentId: str(v.parent_id) !== postId ? str(v.parent_id) : null, postId,
      postUrl: str(obj(v.post).permalink_url), authorId: str(from.id), authorName: str(from.name), body: text, at: created,
    };
  }
  return null;
}

// ───────────────────────────── WhatsApp: mensajes entrantes ─────────────────────────────

const waEvent = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({
    changes: z.array(z.object({
      field: z.string().optional(),
      value: z.object({
        contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string().optional() }).optional() })).optional(),
        messages: z.array(z.object({
          id: z.string(), from: z.string(), type: z.string(), timestamp: z.string().optional(),
          text: z.object({ body: z.string() }).optional(),
          button: z.object({ text: z.string() }).optional(),
          interactive: z.object({ button_reply: z.object({ title: z.string() }).optional(), list_reply: z.object({ title: z.string() }).optional() }).optional(),
          // Llegó desde un anuncio o publicación de Facebook/Instagram con botón de WhatsApp.
          referral: z.object({ source_id: z.union([z.string(), z.number()]).optional(), source_type: z.string().optional(), source_url: z.string().optional(), headline: z.string().optional(), body: z.string().optional() }).passthrough().optional(),
        })).optional(),
        statuses: z.array(z.object({ id: z.string(), status: z.string(), errors: z.array(z.object({ title: z.string().optional(), message: z.string().optional() })).optional() })).optional(),
        // Cambio de estado de una plantilla (field = message_template_status_update).
        event: z.string().optional(),
        message_template_id: z.union([z.string(), z.number()]).optional(),
        message_template_name: z.string().optional(),
        reason: z.string().nullable().optional(),
      }).passthrough(),
    })).default([]),
  })).default([]),
});

const WA_STATUS = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" } as const;

export async function handleWhatsappEvent(token: string, rawBody: string, signature: string | null): Promise<WebhookResult> {
  const i = await integrationByToken("WHATSAPP", token);
  if (!i) return fail(404, "No encontrado");
  if (!validMetaSignature(rawBody, signature, i.secrets.appSecret)) return fail(401, "Firma inválida");
  const parsed = waEvent.safeParse(parseJson(rawBody));
  if (!parsed.success) return ok("ignorado");
  const analyze = new Set<string>();
  for (const change of parsed.data.entry.flatMap((e) => e.changes)) {
    const v = change.value;
    if (change.field === "message_template_status_update") {
      await templateStatusFromWebhook(i.companyId, { message_template_id: v.message_template_id, message_template_name: v.message_template_name, event: v.event, reason: v.reason ?? undefined });
      continue;
    }
    for (const m of v.messages ?? []) {
      const name = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
      const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
      const r = await recordInbound(i.companyId, {
        channel: "WHATSAPP", externalUser: m.from, name, body: text ?? `[${m.type}]`, kind: text ? "text" : m.type, externalId: `wa:${m.id}`,
        at: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
        ad: m.referral?.source_id != null ? { id: String(m.referral.source_id), title: m.referral.headline || m.referral.body || null, url: m.referral.source_url ?? null, sourceType: m.referral.source_type } : null,
      });
      if (!r.duplicate) analyze.add(r.conversationId);
    }
    for (const st of v.statuses ?? []) {
      const status = WA_STATUS[st.status as keyof typeof WA_STATUS];
      if (status) await updateMessageStatus(i.companyId, st.id, status, st.errors?.[0]?.message ?? st.errors?.[0]?.title);
    }
  }
  return { ...ok(), analyze: { companyId: i.companyId, conversationIds: [...analyze] } };
}

// ───────────────────────────── Entrada genérica (TikTok vía Zapier/Make, web) ─────────────────────────────

const genericLead = leadSchema.extend({ source: z.enum(["TIKTOK", "WEB", "META", "WHATSAPP", "MANUAL"]).default("WEB"), id: z.string().max(100).optional() });

export async function handleGenericLead(token: string, rawBody: string): Promise<WebhookResult> {
  const i = await integrationByToken("LEADS", token);
  if (!i) return fail(404, "No encontrado");
  const json = parseJson(rawBody);
  if (json === null) return fail(400, "El cuerpo debe ser JSON.");
  const parsed = genericLead.safeParse(json);
  if (!parsed.success) return fail(400, `Datos inválidos: ${parsed.error.issues.map((x) => x.path.join(".") || x.message).join(", ")}`);
  const { source, id, ...lead } = parsed.data;
  if (!lead.phone && !lead.email) return fail(400, "Envía al menos «phone» o «email».");
  const r = await ingestLead(i.companyId, source, { ...lead, phone: lead.phone ?? undefined, email: lead.email ?? undefined, externalId: id ? `${source.toLowerCase()}:${id}` : null });
  return { status: 200, body: JSON.stringify(r.duplicate ? { ok: true, duplicate: true } : { ok: true, newDeal: r.newDeal }), contentType: "application/json" };
}
