/**
 * Bandeja de mensajes del CRM (estilo Ámbar): entrantes, respuestas por la API
 * oficial, estados, ventana de 24 h, IA (sugerir / responder sola / paso a
 * persona / lo que le falta), plantillas de WhatsApp y aislamiento.
 * Las APIs de Meta y Anthropic se simulan; se verifica lo que se les envía.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { analyzeConversation, answerGap, getAiConfig, saveAiConfig, setConversationAiPaused } from "@/server/crm-ai";
import { handleMetaEvent, handleWhatsappEvent } from "@/server/crm-webhooks";
import { AppError } from "@/server/errors";
import { createProduct } from "@/server/inventory";
import { saveIntegration } from "@/server/integrations";
import { getConversation, listConversations, recordInbound, sendReply, updateMessageStatus } from "@/server/messages";
import { createTemplate, sendTemplate, submitTemplate, syncTemplates } from "@/server/wa-templates";
import { login, makeCompany } from "../support/fixtures";

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};
const sign = (body: string, secret: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const NOW = new Date("2026-11-18T20:00:00Z");

type Call = { url: string; method: string; auth: string | null; body: Record<string, unknown> | null };
/** fetch simulado: responde según la URL y guarda cada llamada. */
function fakeFetch(routes: [RegExp, (c: Call) => Response][]) {
  const calls: Call[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    const c: Call = { url: String(url), method: init?.method ?? "GET", auth: h.get("authorization") ?? h.get("x-api-key"), body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(c);
    const route = routes.find(([re]) => re.test(c.url));
    return route ? route[1](c) : json(404, { error: { message: "no simulado" } });
  }) as typeof fetch;
  return { f, calls };
}
const claudeSays = (out: Record<string, unknown>, stop = "end_turn") =>
  json(200, { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [{ type: "text", text: JSON.stringify(out) }], stop_reason: stop, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
const answer = (o: Partial<Record<string, unknown>> = {}) => ({ etiqueta: "precio", resumen: "Pregunta el precio del pan", respuesta: "¡Hola! El pan tajado cuesta $6.500.", atender_persona: false, motivo: "", falta_informacion: "", ...o });

async function setup(tag: string) {
  const f = await makeCompany(tag);
  const admin = await login(f.admin.email);
  await saveIntegration(admin.actor, "company", "WHATSAPP", { phoneNumberId: "100000000000000", businessAccountId: "200000000000000", accessToken: "wa-token", appSecret: "wa-secret" });
  const inbound = (text: string, id: string, at = new Date(NOW.getTime() - 60_000)) =>
    recordInbound(f.company.id, { channel: "WHATSAPP", externalUser: "573004445566", name: "Carlos", body: text, externalId: `wa:${id}`, at });
  return { ...f, admin, inbound, emp: await login(f.empUser.email) };
}

describe("bandeja", () => {
  it("entrantes, leído, respuesta por la API de WhatsApp y estados que no retroceden", async () => {
    const s = await setup("msg1");
    const r = await s.inbound("¿Cuánto vale el pan?", "1");
    if (r.duplicate) throw new Error("no debía ser duplicado");
    expect(await s.inbound("¿Cuánto vale el pan?", "1")).toEqual({ duplicate: true });
    await s.inbound("¿Y hacen domicilios?", "2", new Date(NOW.getTime() - 30_000));
    expect((await listConversations(s.admin.actor)).conversations[0]).toMatchObject({ channel: "WHATSAPP", customer: "Carlos", unread: 2, preview: "¿Y hacen domicilios?" });

    const conv = await getConversation(s.admin.actor, r.conversationId, NOW);
    expect(conv).toMatchObject({ canReply: true, messages: [{ body: "¿Cuánto vale el pan?" }, { body: "¿Y hacen domicilios?" }] });
    expect((await listConversations(s.admin.actor)).unread).toBe(0); // al abrirla queda leída

    const { f, calls } = fakeFetch([[/\/100000000000000\/messages$/, () => json(200, { messages: [{ id: "wamid.OUT1" }] })]]);
    await sendReply(s.admin.actor, r.conversationId, "Hola Carlos, cuesta $6.500 y sí hacemos domicilios.", f, NOW);
    expect(calls[0]).toMatchObject({ method: "POST", auth: "Bearer wa-token", body: { messaging_product: "whatsapp", to: "573004445566", type: "text", text: { body: "Hola Carlos, cuesta $6.500 y sí hacemos domicilios." } } });
    await updateMessageStatus(s.company.id, "wamid.OUT1", "READ");
    await updateMessageStatus(s.company.id, "wamid.OUT1", "DELIVERED"); // llega tarde: no retrocede
    const out = await db.message.findFirstOrThrow({ where: { externalId: "wamid.OUT1" } });
    expect(out).toMatchObject({ status: "READ", origin: "NEXORA", sentById: s.admin.actor.userId });

    // Error de la plataforma: queda guardado como fallido y se avisa.
    const bad = fakeFetch([[/messages$/, () => json(400, { error: { message: "Recipient phone number not in allowed list" } })]]);
    await expect(sendReply(s.admin.actor, r.conversationId, "Otro mensaje", bad.f, NOW)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("not in allowed list") });
    expect(await db.message.count({ where: { conversationId: r.conversationId, status: "FAILED" } })).toBe(1);
    await expect(sendReply(s.admin.actor, r.conversationId, "", f, NOW)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("ventana de 24 h: después no deja responder con texto libre", async () => {
    const s = await setup("msg2");
    const r = await s.inbound("Hola", "x", new Date(NOW.getTime() - 25 * 3_600_000));
    if (r.duplicate) throw new Error();
    expect((await getConversation(s.admin.actor, r.conversationId, NOW)).canReply).toBe(false);
    const { f, calls } = fakeFetch([]);
    await expect(sendReply(s.admin.actor, r.conversationId, "¿Sigues interesado?", f, NOW)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("24 horas") });
    expect(calls).toHaveLength(0);
  });

  it("Messenger: guarda el mensaje con el nombre del perfil; el eco de lo que enviamos no se duplica", async () => {
    const s = await setup("msg3");
    await saveIntegration(s.admin.actor, "company", "META", { pageId: "123456789012345", pageAccessToken: "page-token", appSecret: "app-secret" });
    const token = (await db.integration.findFirstOrThrow({ where: { companyId: s.company.id, provider: "META" } })).webhookToken;
    const { f } = fakeFetch([
      [/\/PSID1\?fields=name/, () => json(200, { name: "Laura Gómez" })],
      [/\/123456789012345\/messages$/, () => json(200, { recipient_id: "PSID1", message_id: "m_OUT" })],
    ]);
    const ev = (messaging: unknown) => JSON.stringify({ object: "page", entry: [{ messaging: [messaging] }] });
    const inBody = ev({ sender: { id: "PSID1" }, recipient: { id: "123456789012345" }, timestamp: NOW.getTime() - 60_000, message: { mid: "m_IN", text: "¿Tienen tortas?" } });
    const r = await handleMetaEvent(token, inBody, sign(inBody, "app-secret"), f);
    expect(r.analyze?.conversationIds).toHaveLength(1);
    const convId = r.analyze!.conversationIds[0]!;
    expect(await getConversation(s.admin.actor, convId, NOW)).toMatchObject({ channel: "MESSENGER", customer: { name: "Laura Gómez" } });
    await sendReply(s.admin.actor, convId, "Sí, desde $45.000", f, NOW);
    const echo = ev({ sender: { id: "123456789012345" }, recipient: { id: "PSID1" }, message: { mid: "m_OUT", text: "Sí, desde $45.000", is_echo: true } });
    await handleMetaEvent(token, echo, sign(echo, "app-secret"), f);
    expect(await db.message.count({ where: { conversationId: convId, direction: "OUT" } })).toBe(1);
    // Lo que el negocio responde desde la app de Meta también aparece (origen «celular»).
    const fromApp = ev({ sender: { id: "123456789012345" }, recipient: { id: "PSID1" }, message: { mid: "m_APP", text: "Te esperamos", is_echo: true } });
    await handleMetaEvent(token, fromApp, sign(fromApp, "app-secret"), f);
    expect(await db.message.findFirstOrThrow({ where: { externalId: "messenger:m_APP" } })).toMatchObject({ direction: "OUT", origin: "PHONE" });
  });
});

describe("IA de mensajes", () => {
  it("no se activa sin la llave de Claude; con ella sugiere, etiqueta y anota lo que le falta", async () => {
    const s = await setup("ia1");
    await expect(saveAiConfig(s.admin.actor, { enabled: "on", mode: "SUGGEST" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Claude") });
    await saveIntegration(s.admin.actor, "company", "CLAUDE", { apiKey: "sk-ant-empresa" });
    await saveAiConfig(s.admin.actor, { enabled: "on", mode: "SUGGEST", knowledge: "Abrimos de 6 a. m. a 8 p. m.", instructions: "Invita a hacer el pedido.", escalation: "" });
    await createProduct(s.admin.actor, { sku: "PAN", name: "Pan tajado", category: "", kind: "PRODUCT", unit: "UNIDAD", price: "6500", cost: "", taxRate: "0", minStock: "", barcode: "" });
    const r = await s.inbound("¿Cuánto vale el pan tajado? ¿Abren el domingo?", "1");
    if (r.duplicate) throw new Error();

    const { f, calls } = fakeFetch([[/api\.anthropic\.com\/v1\/messages/, () => claudeSays(answer({ falta_informacion: "Horario de los domingos" }))]]);
    const res = await analyzeConversation(s.company.id, r.conversationId, { allowAutoSend: true }, f, NOW);
    expect(res).toMatchObject({ analyzed: true, sent: false }); // modo sugerir: no envía
    const req = calls[0]!;
    expect(req.auth).toBe("Bearer sk-ant-empresa"); // la llave de la empresa (el SDK oficial la envía así)
    expect(req.body).toMatchObject({ model: "claude-opus-5-5", output_config: { effort: "low", format: { type: "json_schema" } } });
    const system = JSON.stringify(req.body!.system);
    expect(system).toContain("Pan tajado (PAN)");
    expect(system).toContain("Abrimos de 6 a. m. a 8 p. m.");
    expect(JSON.stringify(req.body!.messages)).toContain("¿Cuánto vale el pan tajado?");

    const conv = await db.conversation.findUniqueOrThrow({ where: { id: r.conversationId } });
    expect(conv).toMatchObject({ aiTag: "precio", aiSummary: "Pregunta el precio del pan", aiSuggestion: "¡Hola! El pan tajado cuesta $6.500.", needsHuman: false, aiError: null });
    const cfg = await getAiConfig(s.admin.actor);
    expect(cfg.gaps).toMatchObject([{ missing: "Horario de los domingos", count: 1 }]);

    // Enseñar a la IA: se agrega a los conocimientos.
    await answerGap(s.admin.actor, cfg.gaps[0]!.id, "Los domingos abrimos de 7 a. m. a 1 p. m.");
    expect((await getAiConfig(s.admin.actor)).config.knowledge).toContain("- Horario de los domingos: Los domingos abrimos de 7 a. m. a 1 p. m.");
    expect((await getAiConfig(s.admin.actor)).gaps).toHaveLength(0);
  });

  it("modo responder sola: envía, salvo que haga falta una persona o el chat esté en pausa", async () => {
    const s = await setup("ia2");
    await saveIntegration(s.admin.actor, "company", "CLAUDE", { apiKey: "sk-ant-x" });
    await saveAiConfig(s.admin.actor, { enabled: "on", mode: "AUTO" });
    const r = await s.inbound("¿Precio del pan?", "1");
    if (r.duplicate) throw new Error();
    let out = answer();
    const { f, calls } = fakeFetch([
      [/api\.anthropic\.com/, () => claudeSays(out)],
      [/\/100000000000000\/messages$/, () => json(200, { messages: [{ id: `wamid.AI${calls.length}` }] })],
    ]);
    expect(await analyzeConversation(s.company.id, r.conversationId, { allowAutoSend: true }, f, NOW)).toMatchObject({ sent: true });
    expect(await db.message.findFirstOrThrow({ where: { conversationId: r.conversationId, direction: "OUT" } })).toMatchObject({ origin: "AI", body: "¡Hola! El pan tajado cuesta $6.500." });

    // Reclamo: la IA marca «atender persona» y no envía.
    out = answer({ etiqueta: "reclamo", atender_persona: true, motivo: "Reclama un cobro" });
    const LATER = new Date(NOW.getTime() + 10 * 60_000);
    await s.inbound("Me cobraron dos veces", "2", new Date(NOW.getTime() + 5 * 60_000));
    expect(await analyzeConversation(s.company.id, r.conversationId, { allowAutoSend: true }, f, LATER)).toMatchObject({ analyzed: true, sent: false });
    expect(await db.conversation.findUniqueOrThrow({ where: { id: r.conversationId } })).toMatchObject({ needsHuman: true, humanReason: "Reclama un cobro", aiTag: "reclamo" });

    // Una persona pausa la IA en este chat: tampoco envía.
    out = answer();
    await setConversationAiPaused(s.admin.actor, r.conversationId, true);
    await s.inbound("¿Y el pan integral?", "3", new Date(NOW.getTime() + 6 * 60_000));
    expect(await analyzeConversation(s.company.id, r.conversationId, { allowAutoSend: true }, f, LATER)).toMatchObject({ analyzed: true, sent: false });
    expect(await db.message.count({ where: { conversationId: r.conversationId, origin: "AI" } })).toBe(1);
  });

  it("si Claude se niega o falla, el chat queda para una persona con el motivo", async () => {
    const s = await setup("ia3");
    await saveIntegration(s.admin.actor, "company", "CLAUDE", { apiKey: "sk-ant-x" });
    await saveAiConfig(s.admin.actor, { enabled: "on", mode: "AUTO" });
    const r = await s.inbound("Hola", "1");
    if (r.duplicate) throw new Error();
    const refusal = fakeFetch([[/anthropic/, () => json(200, { id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: "refusal", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } })]]);
    expect(await analyzeConversation(s.company.id, r.conversationId, { allowAutoSend: true }, refusal.f, NOW)).toMatchObject({ skipped: "refusal" });
    expect((await db.conversation.findUniqueOrThrow({ where: { id: r.conversationId } })).needsHuman).toBe(true);
    const down = fakeFetch([[/anthropic/, () => json(401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } })]]);
    expect(await analyzeConversation(s.company.id, r.conversationId, { allowAutoSend: true }, down.f, NOW)).toMatchObject({ skipped: "error", error: expect.stringContaining("llave de Claude") });
  });
});

describe("plantillas de WhatsApp", () => {
  it("crear (validada), enviar a Meta, aprobada por aviso y usarla para retomar un chat de hace días", async () => {
    const s = await setup("tpl1");
    await expect(createTemplate(s.admin.actor, { name: "Retomar Pedido", category: "MARKETING", body: "Hola {{2}}, ¿retomamos?", examples: [] })).rejects.toMatchObject({
      code: "VALIDATION", fieldErrors: { name: expect.any(String), body: expect.stringContaining("orden") },
    });
    await expect(createTemplate(s.admin.actor, { name: "retomar_pedido", category: "MARKETING", body: "Hola {{1}}, ¿retomamos tu pedido de {{2}}?", examples: ["Ana"] })).rejects.toMatchObject({ fieldErrors: { examples: expect.any(String) } });
    const t = await createTemplate(s.admin.actor, { name: "retomar_pedido", category: "MARKETING", body: "Hola {{1}}, ¿retomamos tu pedido de {{2}}? Responde y te ayudamos.", examples: ["Ana", "tortas"], buttons: ["Sí, quiero", "No por ahora"] });

    const { f, calls } = fakeFetch([
      [/\/200000000000000\/message_templates$/, () => json(200, { id: "tpl-meta-1", status: "PENDING", category: "MARKETING" })],
      [/\/100000000000000\/messages$/, () => json(200, { messages: [{ id: "wamid.TPL" }] })],
    ]);
    expect(await submitTemplate(s.admin.actor, t.id, f)).toEqual({ status: "PENDING" });
    expect(calls[0]).toMatchObject({
      method: "POST", auth: "Bearer wa-token",
      body: {
        name: "retomar_pedido", language: "es", category: "MARKETING",
        components: [{ type: "BODY", text: "Hola {{1}}, ¿retomamos tu pedido de {{2}}? Responde y te ayudamos.", example: { body_text: [["Ana", "tortas"]] } }, { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sí, quiero" }, { type: "QUICK_REPLY", text: "No por ahora" }] }],
      },
    });
    expect(await code(submitTemplate(s.admin.actor, t.id, f))).toBe("CONFLICT"); // ya enviada

    // Chat de hace 3 días: no se puede escribir texto libre, pero sí la plantilla aprobada.
    const r = await s.inbound("Quiero una torta", "1", new Date(NOW.getTime() - 72 * 3_600_000));
    if (r.duplicate) throw new Error();
    expect(await code(sendTemplate(s.admin.actor, r.conversationId, t.id, ["Carlos", "torta"], f, NOW))).toBe("CONFLICT"); // aún en revisión

    // Meta avisa que la aprobó.
    const token = (await db.integration.findFirstOrThrow({ where: { companyId: s.company.id, provider: "WHATSAPP" } })).webhookToken;
    const ev = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "message_template_status_update", value: { event: "APPROVED", message_template_id: "tpl-meta-1", message_template_name: "retomar_pedido", reason: "NONE" } }] }] });
    await handleWhatsappEvent(token, ev, sign(ev, "wa-secret"));
    expect((await db.waTemplate.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("APPROVED");

    await expect(sendTemplate(s.admin.actor, r.conversationId, t.id, ["Carlos"], f, NOW)).rejects.toMatchObject({ code: "VALIDATION" });
    await sendTemplate(s.admin.actor, r.conversationId, t.id, ["Carlos", "torta"], f, NOW);
    expect(calls.at(-1)).toMatchObject({
      body: { type: "template", to: "573004445566", template: { name: "retomar_pedido", language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: "Carlos" }, { type: "text", text: "torta" }] }] } },
    });
    expect(await db.message.findFirstOrThrow({ where: { externalId: "wamid.TPL" } })).toMatchObject({ kind: "template", body: "Hola Carlos, ¿retomamos tu pedido de torta? Responde y te ayudamos." });
  });

  it("sincronizar trae el estado de Meta y agrega las plantillas creadas allá", async () => {
    const s = await setup("tpl2");
    const { f } = fakeFetch([[/message_templates\?fields=/, () => json(200, { data: [
      { id: "1", name: "recordatorio_pago", language: "es", status: "APPROVED", category: "UTILITY", components: [{ type: "BODY", text: "Hola {{1}}, te recordamos tu pago." }] },
      { id: "2", name: "promo_navidad", language: "es", status: "REJECTED", category: "MARKETING", rejected_reason: "INVALID_FORMAT", components: [{ type: "BODY", text: "Promo" }] },
    ] })]]);
    expect(await syncTemplates(s.admin.actor, f)).toEqual({ updated: 2 });
    const all = await db.waTemplate.findMany({ where: { companyId: s.company.id }, orderBy: { name: "asc" } });
    expect(all.map((x) => [x.name, x.status, x.rejectReason])).toEqual([["promo_navidad", "REJECTED", "INVALID_FORMAT"], ["recordatorio_pago", "APPROVED", null]]);
  });
});

describe("aislamiento", () => {
  it("otra empresa no ve ni responde conversaciones ajenas; un empleado no entra", async () => {
    const a = await setup("iso1");
    const b = await setup("iso2");
    const r = await a.inbound("Hola", "1");
    if (r.duplicate) throw new Error();
    expect(await code(getConversation(b.admin.actor, r.conversationId, NOW))).toBe("NOT_FOUND");
    expect(await code(sendReply(b.admin.actor, r.conversationId, "hola", fakeFetch([]).f, NOW))).toBe("NOT_FOUND");
    expect(await code(setConversationAiPaused(b.admin.actor, r.conversationId, true))).toBe("NOT_FOUND");
    expect((await listConversations(b.admin.actor)).conversations).toHaveLength(0);
    expect(await code(listConversations(a.emp.actor))).toBe("FORBIDDEN");
    expect(await code(getAiConfig(a.emp.actor))).toBe("FORBIDDEN");
  });
});
