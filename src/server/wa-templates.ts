import "server-only";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { integrationCredentials } from "@/server/integrations";
import type { Actor } from "@/server/sessions";

/**
 * Plantillas de WhatsApp (como en Ámbar Couture): la empresa las escribe en
 * Nexora, las envía a Meta para aprobación y, aprobadas, sirven para escribir
 * fuera de la ventana de 24 h (retomar un chat, recordatorios). El estado
 * llega por el aviso «message_template_status_update» o con «Sincronizar».
 */

const META_VERSION = "v21.0";
const preview = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}…` : s);
export const STATUS_LABEL: Record<string, string> = { DRAFT: "Borrador", PENDING: "En revisión de Meta", APPROVED: "Aprobada", REJECTED: "Rechazada", PAUSED: "Pausada", DISABLED: "Desactivada" };

/** Variables {{1}}, {{2}}… del texto, en orden. */
export function templateVariables(body: string) {
  return [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
}

/** Texto final con las variables reemplazadas. */
export const renderTemplate = (body: string, params: string[]) => body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? `{{${n}}}`);

export const templateSchema = z
  .object({
    name: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,60}$/, { error: "Solo minúsculas, números y guion bajo (ej.: retomar_pedido)." }),
    category: z.enum(["UTILITY", "MARKETING"], { error: "Elige la categoría." }),
    language: z.enum(["es", "es_CO", "es_MX", "es_ES", "en_US"]).default("es"),
    body: z.string().trim().min(10, { error: "Escribe el mensaje." }).max(1024, { error: "Máximo 1.024 caracteres." }),
    examples: z.array(z.string().trim().max(100)).default([]),
    buttons: z.array(z.string().trim().min(1).max(25, { error: "Cada botón: máximo 25 caracteres." })).max(3, { error: "Máximo 3 botones." }).default([]),
  })
  .superRefine((v, ctx) => {
    const vars = templateVariables(v.body);
    const expected = vars.map((_, i) => i + 1);
    if (vars.some((n, i) => n !== expected[i])) ctx.addIssue({ code: "custom", path: ["body"], message: "Las variables deben ir en orden: {{1}}, {{2}}, {{3}}…" });
    if (/^\s*\{\{\d+\}\}|\{\{\d+\}\}\s*$/.test(v.body)) ctx.addIssue({ code: "custom", path: ["body"], message: "Meta no acepta que el mensaje empiece o termine con una variable." });
    if (v.examples.length < vars.length || v.examples.slice(0, vars.length).some((e) => !e)) ctx.addIssue({ code: "custom", path: ["examples"], message: `Escribe un ejemplo para cada variable (${vars.length}).` });
  });

const waCreds = async (companyId: string) => {
  const c = await integrationCredentials(companyId, "WHATSAPP");
  if (!c?.secrets.accessToken || !c.config.businessAccountId) throw new AppError("CONFLICT", "Conecta WhatsApp en Integraciones (con el ID de la cuenta de WhatsApp Business) para usar plantillas.");
  return c;
};

export async function listTemplates(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const rows = await db.waTemplate.findMany({ where: { companyId }, orderBy: [{ status: "asc" }, { name: "asc" }] });
  return rows.map((t) => ({ id: t.id, name: t.name, language: t.language, category: t.category, body: t.body, examples: t.examples, buttons: t.buttons, status: t.status, rejectReason: t.rejectReason, variables: templateVariables(t.body).length, updatedAt: t.updatedAt }));
}

export async function createTemplate(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const r = templateSchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
  const v = r.data;
  try {
    return await db.$transaction(async (tx) => {
      const t = await tx.waTemplate.create({ data: { companyId, ...v, examples: v.examples.slice(0, templateVariables(v.body).length), status: "DRAFT" } });
      await audit({ companyId, actorUserId: actor.userId, action: "wa_template.create", entityType: "wa_template", entityId: t.id, after: { name: v.name } }, tx);
      return t;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError("CONFLICT", "Ya tienes una plantilla con ese nombre e idioma.", { name: "Ya existe." });
    throw e;
  }
}

/** Envía la plantilla a Meta para aprobación (borrador o rechazada después de corregirla). */
export async function submitTemplate(actor: Actor, id: string, f: typeof fetch = fetch) {
  const companyId = requireCompanyAdmin(actor);
  const t = await db.waTemplate.findFirst({ where: { id, companyId } });
  if (!t) throw notFound("La plantilla");
  if (t.status !== "DRAFT" && t.status !== "REJECTED") throw new AppError("CONFLICT", "Esta plantilla ya se envió a Meta.");
  const c = await waCreds(companyId);
  const components: Record<string, unknown>[] = [{ type: "BODY", text: t.body, ...(t.examples.length ? { example: { body_text: [t.examples] } } : {}) }];
  if (t.buttons.length) components.push({ type: "BUTTONS", buttons: t.buttons.map((text) => ({ type: "QUICK_REPLY", text })) });
  const r = await f(`https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(c.config.businessAccountId!)}/message_templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.secrets.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: t.name, language: t.language, category: t.category, components }),
    signal: AbortSignal.timeout(20_000),
  });
  const d = (await r.json().catch(() => ({}))) as { id?: string; status?: string; error?: { message?: string; error_user_msg?: string } };
  if (!r.ok || !d.id) throw new AppError("CONFLICT", `Meta no aceptó la plantilla: ${d.error?.error_user_msg ?? d.error?.message ?? r.status}`);
  const status = (["APPROVED", "REJECTED", "PAUSED"].includes(d.status ?? "") ? d.status : "PENDING") as "APPROVED" | "REJECTED" | "PAUSED" | "PENDING";
  await db.$transaction(async (tx) => {
    await tx.waTemplate.update({ where: { id }, data: { metaId: d.id, status, rejectReason: null } });
    await audit({ companyId, actorUserId: actor.userId, action: "wa_template.submit", entityType: "wa_template", entityId: id, after: { name: t.name, status } }, tx);
  });
  return { status };
}

const META_STATUS: Record<string, "APPROVED" | "REJECTED" | "PENDING" | "PAUSED" | "DISABLED"> = { APPROVED: "APPROVED", REJECTED: "REJECTED", PENDING: "PENDING", IN_APPEAL: "PENDING", PAUSED: "PAUSED", DISABLED: "DISABLED", FLAGGED: "PAUSED" };

/** Trae de Meta el estado de todas las plantillas de la cuenta (y agrega las que se crearon allá). */
export async function syncTemplates(actor: Actor, f: typeof fetch = fetch) {
  const companyId = requireCompanyAdmin(actor);
  const c = await waCreds(companyId);
  const r = await f(`https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(c.config.businessAccountId!)}/message_templates?fields=id,name,language,status,category,rejected_reason,components&limit=200`, {
    headers: { Authorization: `Bearer ${c.secrets.accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });
  const d = (await r.json().catch(() => ({}))) as { data?: { id: string; name: string; language: string; status: string; category: string; rejected_reason?: string; components?: { type: string; text?: string; buttons?: { text: string }[] }[] }[]; error?: { message?: string } };
  if (!r.ok) throw new AppError("CONFLICT", `Meta no respondió: ${d.error?.message ?? r.status}`);
  let updated = 0;
  for (const m of d.data ?? []) {
    const status = META_STATUS[m.status] ?? "PENDING";
    const body = m.components?.find((x) => x.type === "BODY")?.text ?? "";
    const buttons = m.components?.find((x) => x.type === "BUTTONS")?.buttons?.map((b) => b.text) ?? [];
    const reason = m.rejected_reason && m.rejected_reason !== "NONE" ? m.rejected_reason : null;
    await db.waTemplate.upsert({
      where: { companyId_name_language: { companyId, name: m.name, language: m.language } },
      create: { companyId, name: m.name, language: m.language, category: m.category, body: body || "(sin texto)", buttons, status, metaId: m.id, rejectReason: reason },
      update: { status, metaId: m.id, rejectReason: reason },
    });
    updated++;
  }
  return { updated };
}

/** Aviso de Meta con el nuevo estado de una plantilla. */
export async function templateStatusFromWebhook(companyId: string, v: { message_template_id?: string | number; message_template_name?: string; event?: string; reason?: string }) {
  const status = META_STATUS[String(v.event ?? "")];
  if (!status) return;
  await db.waTemplate.updateMany({
    where: { companyId, OR: [...(v.message_template_id ? [{ metaId: String(v.message_template_id) }] : []), ...(v.message_template_name ? [{ name: v.message_template_name }] : [])] },
    data: { status, rejectReason: status === "REJECTED" ? (v.reason && v.reason !== "NONE" ? v.reason : "Rechazada por Meta") : null },
  });
}

export async function deleteTemplate(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  const t = await db.waTemplate.findFirst({ where: { id, companyId } });
  if (!t) throw notFound("La plantilla");
  if (t.status !== "DRAFT" && t.status !== "REJECTED") throw new AppError("CONFLICT", "Solo se borran borradores o plantillas rechazadas; las demás se administran en Meta.");
  await db.waTemplate.delete({ where: { id } });
}

/**
 * Envía una plantilla aprobada a una conversación de WhatsApp (sirve aunque
 * hayan pasado más de 24 h). Las variables se llenan con «params».
 */
export async function sendTemplate(actor: Actor, conversationId: string, templateId: string, rawParams: unknown, f: typeof fetch = fetch, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const [conv, t] = await Promise.all([
    db.conversation.findFirst({ where: { id: conversationId, companyId } }),
    db.waTemplate.findFirst({ where: { id: templateId, companyId } }),
  ]);
  if (!conv) throw notFound("La conversación");
  if (!t) throw notFound("La plantilla");
  if (conv.channel !== "WHATSAPP") throw new AppError("CONFLICT", "Las plantillas son solo para WhatsApp.");
  if (t.status !== "APPROVED") throw new AppError("CONFLICT", "La plantilla aún no está aprobada por Meta.");
  const params = z.array(z.string().trim().min(1, { error: "Llena todas las variables." }).max(200)).safeParse(rawParams);
  const n = templateVariables(t.body).length;
  if (!params.success || params.data.length !== n) throw new AppError("VALIDATION", `Llena las ${n} variable(s) de la plantilla.`);
  const c = await waCreds(companyId);
  const r = await f(`https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(c.config.phoneNumberId!)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.secrets.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to: conv.externalUser, type: "template",
      template: { name: t.name, language: { code: t.language }, ...(n ? { components: [{ type: "body", parameters: params.data.map((text) => ({ type: "text", text })) }] } : {}) },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const d = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
  const body = renderTemplate(t.body, params.data);
  const ok = r.ok && !!d.messages?.[0]?.id;
  await db.$transaction(async (tx) => {
    await tx.message.create({
      data: { companyId, conversationId: conv.id, direction: "OUT", body, kind: "template", status: ok ? "SENT" : "FAILED", origin: "NEXORA", error: ok ? null : (d.error?.message ?? `Error ${r.status}`).slice(0, 300), externalId: ok ? d.messages![0]!.id : null, sentById: actor.userId, createdAt: now },
    });
    if (ok) await tx.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: now, lastPreview: preview(body) } });
    await audit({ companyId, actorUserId: actor.userId, action: ok ? "wa_template.send" : "message.fail", entityType: "conversation", entityId: conv.id, after: { template: t.name } }, tx);
  });
  if (!ok) throw new AppError("CONFLICT", `WhatsApp no aceptó la plantilla: ${d.error?.message ?? r.status}`);
}
