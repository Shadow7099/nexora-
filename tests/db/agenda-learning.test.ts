/**
 * Agenda con botones en el chat (día → hora → cita) por WhatsApp, Messenger y
 * la demostración; la IA ofrece horarios sola; aprendizaje diario de la IA con
 * versiones y volver atrás. Las APIs de Meta y Anthropic se simulan.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { availableSlots, bookManually, handleBookingAction, listAppointments, offerDaysFromChat, setAppointmentStatus } from "@/server/booking";
import { saveAiConfig, setAutoReply } from "@/server/crm-ai";
import { loadDemo, simulateCustomer } from "@/server/crm-demo";
import { applyChanges, learn, learnAll, listVersions, revertToVersion, setAutoLearn } from "@/server/crm-learning";
import { handleWhatsappEvent } from "@/server/crm-webhooks";
import { AppError } from "@/server/errors";
import { saveIntegration } from "@/server/integrations";
import { adsReport, getConversation, listConversations, recordInbound } from "@/server/messages";
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
// Lunes 23 de noviembre de 2026, 9:00 a. m. en Colombia.
const NOW = new Date("2026-11-23T14:00:00Z");

async function setup(tag: string) {
  const f = await makeCompany(tag);
  return { ...f, admin: await login(f.admin.email) };
}

describe("agenda con botones", () => {
  it("horarios libres: horario por defecto, sin la próxima hora y sin bloques llenos", async () => {
    const s = await setup("ag1");
    const { days } = await availableSlots(s.company.id, NOW, 7);
    // Lunes desde las 10:00 (las 9:00 ya empezó: se deja una hora), sin domingos.
    expect(days[0]!.day).toBe("2026-11-23");
    expect(days[0]!.slots[0]!.toISOString()).toBe("2026-11-23T15:00:00.000Z");
    expect(days.some((d) => d.day === "2026-11-29")).toBe(false);
  });

  it("WhatsApp: botones de días, lista de horas y cita creada al tocar; el último cupo no se toma dos veces", async () => {
    const s = await setup("ag2");
    await saveIntegration(s.admin.actor, "company", "WHATSAPP", { phoneNumberId: "100000000000000", businessAccountId: "200000000000000", accessToken: "wa-token", appSecret: "wa-secret" });
    const sent: Record<string, unknown>[] = [];
    const f = (async (_u: string | URL, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return json(200, { messages: [{ id: `wamid.AGENDA${sent.length}` }] });
    }) as typeof fetch;
    const inbound = await recordInbound(s.company.id, { channel: "WHATSAPP", externalUser: "573001112244", name: "Laura", body: "Quiero una cita", externalId: "wa:IN1", at: new Date(NOW.getTime() - 60_000) });
    const convId = inbound.duplicate ? "" : inbound.conversationId;

    await offerDaysFromChat(s.admin.actor, convId, NOW, f);
    expect(sent[0]).toMatchObject({ type: "interactive", interactive: { type: "button", action: { buttons: [{ reply: { id: "ag_d_2026-11-23" } }, { reply: { id: "ag_d_2026-11-24" } }, { reply: { id: "ag_d_2026-11-25" } }] } } });

    // Tocó «mar 24 nov» → lista de horas (más de 3 opciones: lista).
    await handleBookingAction(s.company.id, convId, "ag_d_2026-11-24", NOW, f);
    const list = sent[1] as { interactive: { type: string; action: { sections: { rows: { id: string; title: string }[] }[] } } };
    expect(list.interactive.type).toBe("list");
    const rows = list.interactive.action.sections[0]!.rows;
    expect(rows.at(-1)!.id).toBe("ag_otro");
    expect(rows[0]!.id).toBe("ag_h_2026-11-24T13:00:00.000Z"); // 8:00 a. m.

    // Tocó la hora → cita y confirmación.
    await handleBookingAction(s.company.id, convId, rows[0]!.id, NOW, f);
    expect(sent[2]).toMatchObject({ type: "text", text: { body: expect.stringContaining("Tu cita quedó para el") } });
    const ag = await listAppointments(s.admin.actor, { desde: "2026-11-24", hasta: "2026-11-24" });
    expect(ag.days[0]!.items[0]).toMatchObject({ status: "BOOKED", source: "CHAT", time: expect.stringMatching(/^8:00/) });
    // Ese bloque ya no se ofrece, y agendarlo otra vez no se puede.
    expect((await availableSlots(s.company.id, NOW, 2)).days.find((d) => d.day === "2026-11-24")!.slots[0]!.toISOString()).toBe("2026-11-24T14:00:00.000Z");
    expect(await code(bookManually(s.admin.actor, { conversationId: convId, startsAt: "2026-11-24T13:00:00.000Z" }, NOW, f))).toBe("CONFLICT");
    await setAppointmentStatus(s.admin.actor, ag.days[0]!.items[0]!.id, "ATTENDED");
    expect(await code(setAppointmentStatus(s.admin.actor, ag.days[0]!.items[0]!.id, "OTRO"))).toBe("VALIDATION");
    // Otra empresa no la ve ni la cambia.
    const other = await setup("ag2b");
    expect(await code(setAppointmentStatus(other.admin.actor, ag.days[0]!.items[0]!.id, "CANCELLED"))).toBe("NOT_FOUND");
  });

  it("el aviso de WhatsApp con el botón tocado lo responde la agenda (no la IA)", async () => {
    const s = await setup("ag3");
    await saveIntegration(s.admin.actor, "company", "WHATSAPP", { phoneNumberId: "100000000000000", businessAccountId: "200000000000000", accessToken: "wa-token", appSecret: "wa-secret" });
    const token = (await db.integration.findFirstOrThrow({ where: { companyId: s.company.id, provider: "WHATSAPP" } })).webhookToken;
    const slot = (await availableSlots(s.company.id)).days[1]!.slots[0]!;
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: {
      contacts: [{ wa_id: "573001112255", profile: { name: "Ana" } }],
      messages: [{ id: "wamid.BTN1", from: "573001112255", type: "interactive", timestamp: String(Math.floor(Date.now() / 1000)), interactive: { type: "list_reply", list_reply: { id: `ag_h_${slot.toISOString()}`, title: "10:00 a. m." } } }],
    } }] }] });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => json(200, { messages: [{ id: "wamid.CONF" }] })) as typeof fetch;
    try {
      const r = await handleWhatsappEvent(token, body, sign(body, "wa-secret"));
      expect(r.analyze?.conversationIds).toEqual([]);
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(await db.appointment.count({ where: { companyId: s.company.id, startsAt: slot } })).toBe(1);
  });

  it("demostración: la IA ofrece los días sola, el cliente toca día y hora, y la cita cuenta en el informe del anuncio", async () => {
    const s = await setup("ag4");
    await loadDemo(s.admin.actor);
    const valen = (await listConversations(s.admin.actor)).conversations.find((c) => c.customer === "@valen.moda")!;
    const conv = await getConversation(s.admin.actor, valen.id);
    const offer = conv.messages.at(-1)!;
    expect(offer.buttons?.length).toBe(3);
    await simulateCustomer(s.admin.actor, valen.id, offer.buttons![0]!.title, new Date(), offer.buttons![0]!.id);
    const hours = (await getConversation(s.admin.actor, valen.id)).messages.at(-1)!.buttons!;
    expect(hours.at(-1)!.id).toBe("ag_otro");
    await simulateCustomer(s.admin.actor, valen.id, hours[0]!.title, new Date(), hours[0]!.id);
    expect((await getConversation(s.admin.actor, valen.id)).messages.at(-1)!.body).toContain("Tu cita quedó");
    const report = await adsReport(s.admin.actor);
    expect(report.rows.find((r) => r.title === "Nueva colección · Escríbenos por WhatsApp")!.appointments).toBe(1);

    // Respuesta automática: «quiero agendar» → la IA responde con los botones de días.
    await setAutoReply(s.admin.actor, true);
    const jorge = (await listConversations(s.admin.actor)).conversations.find((c) => c.customer === "Jorge Medina")!;
    await simulateCustomer(s.admin.actor, jorge.id, "quiero agendar una cita para mañana");
    const last = (await getConversation(s.admin.actor, jorge.id)).messages.at(-1)!;
    expect(last).toMatchObject({ origin: "AI", kind: "interactive" });
    expect(last.buttons!.every((b) => b.id.startsWith("ag_d_"))).toBe(true);
  });
});

describe("aprendizaje diario de la IA", () => {
  it("aplica cambios: agregar, reemplazar y quitar una frase exacta (si no existe, no lo aplica)", () => {
    const r = applyChanges({ knowledge: "- Domicilios $5.000", instructions: "Saluda siempre.", escalation: "" }, [
      { seccion: "conocimientos", operacion: "agregar", antes: "", despues: "Abrimos domingos de 9 a 1", motivo: "x" },
      { seccion: "instrucciones", operacion: "reemplazar", antes: "Saluda siempre.", despues: "Saluda solo al inicio.", motivo: "x" },
      { seccion: "escalamiento", operacion: "quitar", antes: "no existe", despues: "", motivo: "x" },
    ]);
    expect(r.cfg).toEqual({ knowledge: "- Domicilios $5.000\n- Abrimos domingos de 9 a 1", instructions: "Saluda solo al inicio.", escalation: "" });
    expect(r.changes.map((c) => c.aplicado)).toEqual([true, true, false]);
  });

  it("con Claude: analiza la semana, aplica las mejoras, guarda la versión y se puede volver atrás", async () => {
    const s = await setup("le1");
    await saveIntegration(s.admin.actor, "company", "CLAUDE", { apiKey: "sk-ant-empresa" });
    await saveAiConfig(s.admin.actor, { enabled: "on", mode: "SUGGEST", knowledge: "- Domicilios $5.000", instructions: "Saluda siempre.", escalation: "" });
    await recordInbound(s.company.id, { channel: "WHATSAPP", externalUser: "573001110000", name: "Pedro", body: "¿Abren el domingo?", externalId: "wa:L1", at: new Date(Date.now() - 3_600_000) });
    let prompt = "";
    const f = (async (_u: string | URL, init?: RequestInit) => {
      prompt = JSON.parse(String(init?.body)).messages[0].content;
      return json(200, { id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
        content: [{ type: "text", text: JSON.stringify({ resumen: "Preguntan mucho por los domingos.", cambios: [{ seccion: "instrucciones", operacion: "reemplazar", antes: "Saluda siempre.", despues: "Saluda solo al inicio.", motivo: "Suena repetitivo" }] }) }] });
    }) as typeof fetch;
    const r = await learn(s.company.id, { manual: true, userId: s.admin.actor.userId, fetch: f });
    expect(r).toMatchObject({ learned: true, usedAi: true, summary: "Preguntan mucho por los domingos." });
    expect(prompt).toContain("¿Abren el domingo?");
    expect((await db.crmAiConfig.findUniqueOrThrow({ where: { companyId: s.company.id } })).instructions).toBe("Saluda solo al inicio.");
    const v = await listVersions(s.admin.actor);
    expect(v.versions.map((x) => x.source)).toEqual(["learn", "manual"]);
    // Volver a la versión anterior (la del cambio a mano).
    await revertToVersion(s.admin.actor, v.versions[1]!.id);
    expect((await db.crmAiConfig.findUniqueOrThrow({ where: { companyId: s.company.id } })).instructions).toBe("Saluda siempre.");
    expect((await listVersions(s.admin.actor)).versions[0]!.source).toBe("revert");
    const other = await setup("le1b");
    expect(await code(revertToVersion(other.admin.actor, v.versions[1]!.id))).toBe("NOT_FOUND");
  });

  it("tarea diaria: solo empresas con la IA activa y el aprendizaje encendido; sin llave usa reglas simples", async () => {
    const s = await setup("le2");
    await loadDemo(s.admin.actor);
    await setAutoReply(s.admin.actor, false); // deja la IA activa (sugerir)
    await setAutoLearn(s.admin.actor, false);
    expect(await learn(s.company.id)).toEqual({ skipped: "off" });
    await setAutoLearn(s.admin.actor, true);
    const results = await learnAll(new Date());
    expect(results.find((x) => x.companyId === s.company.id)).toEqual({ companyId: s.company.id, ok: true });
    const latest = (await listVersions(s.admin.actor)).versions[0]!;
    expect(latest).toMatchObject({ source: "learn", summary: expect.stringContaining("chats") });
    // Ya aprendió hoy: la siguiente corrida del día no la repite.
    expect((await learnAll(new Date())).some((x) => x.companyId === s.company.id)).toBe(false);
  });
});
