/**
 * CRM estilo Ámbar: de qué anuncio llegó cada chat (WhatsApp, Messenger e
 * Instagram), comentarios de redes (entrada, IA, respuesta pública o privada),
 * avisos de la bandeja, informe de anuncios y la demostración sin conectar nada.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { demoAnalysis, setAutoReply } from "@/server/crm-ai";
import { clearDemo, hasDemo, loadDemo, simulateCustomer } from "@/server/crm-demo";
import { commentFromChange, handleMetaEvent, handleWhatsappEvent } from "@/server/crm-webhooks";
import { AppError } from "@/server/errors";
import { saveIntegration } from "@/server/integrations";
import { adsReport, getConversation, inboxAlerts, listConversations, resolveHuman, sendReply } from "@/server/messages";
import { fallbackSuggestion, ignoreComment, listComments, replyComment } from "@/server/social-comments";
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
const tokenOf = async (companyId: string, provider: string) => (await db.integration.findFirstOrThrow({ where: { companyId, provider } })).webhookToken;

async function setup(tag: string) {
  const f = await makeCompany(tag);
  return { ...f, admin: await login(f.admin.email) };
}

describe("de qué anuncio llegó cada chat", () => {
  it("WhatsApp: guarda el anuncio (referral) y abre la oportunidad con su nombre; aparece en avisos, filtro e informe", async () => {
    const s = await setup("ad1");
    await saveIntegration(s.admin.actor, "company", "WHATSAPP", { phoneNumberId: "100000000000000", businessAccountId: "200000000000000", accessToken: "wa-token", appSecret: "wa-secret" });
    const token = await tokenOf(s.company.id, "WHATSAPP");
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: {
        contacts: [{ wa_id: "573001112233", profile: { name: "Laura" } }],
        messages: [{ id: "wamid.AD1", from: "573001112233", type: "text", timestamp: String(Math.floor(Date.now() / 1000)), text: { body: "Hola, vi su anuncio" },
          referral: { source_id: "120210000000000009", source_type: "ad", source_url: "https://fb.me/anuncio", headline: "Promo de temporada" } }],
      } }] }],
    });
    const r = await handleWhatsappEvent(token, body, sign(body, "wa-secret"));
    const convId = r.analyze!.conversationIds[0]!;
    const conv = await getConversation(s.admin.actor, convId);
    expect(conv.ad).toMatchObject({ id: "120210000000000009", title: "Promo de temporada", url: "https://fb.me/anuncio", sourceType: "ad" });
    const deal = await db.deal.findFirstOrThrow({ where: { companyId: s.company.id } });
    expect(deal.title).toBe("Anuncio: Promo de temporada");

    const alerts = await inboxAlerts(s.admin.actor);
    expect(alerts).toMatchObject({ adsToday: 1, latestAd: { adTitle: "Promo de temporada" } });
    expect((await listConversations(s.admin.actor, { ver: "anuncios" })).conversations).toHaveLength(1);
    expect((await listConversations(s.admin.actor, { anuncio: "120210000000000009" })).conversations[0]!.ad?.title).toBe("Promo de temporada");

    // Ganar la venta se refleja en el informe del anuncio.
    await db.deal.update({ where: { id: deal.id }, data: { stage: "WON", value: 250000 } });
    const report = await adsReport(s.admin.actor);
    expect(report.rows).toEqual([expect.objectContaining({ adId: "120210000000000009", chats: 1, customers: 1, won: 1, value: 250000, channels: ["WHATSAPP"] })]);
  });

  it("Messenger e Instagram: referral de anuncio (ads_context_data)", async () => {
    const s = await setup("ad2");
    await saveIntegration(s.admin.actor, "company", "META", { pageId: "123456789012345", pageAccessToken: "page-token", appSecret: "app-secret" });
    const token = await tokenOf(s.company.id, "META");
    const f = (async () => json(200, { username: "valen" })) as unknown as typeof fetch;
    const body = JSON.stringify({ object: "instagram", entry: [{ id: "17841400000000000", messaging: [{
      sender: { id: "IGSID1" }, recipient: { id: "17841400000000000" }, timestamp: Date.now(),
      message: { mid: "m_IG1", text: "¿Precio?", referral: { source: "ADS", type: "OPEN_THREAD", ad_id: "120210000000000010", ads_context_data: { ad_title: "Nueva colección" } } },
    }] }] });
    const r = await handleMetaEvent(token, body, sign(body, "app-secret"), f);
    const conv = await getConversation(s.admin.actor, r.analyze!.conversationIds[0]!);
    expect(conv).toMatchObject({ channel: "INSTAGRAM", ad: { id: "120210000000000010", title: "Nueva colección" } });
  });
});

describe("comentarios de redes", () => {
  it("lee comentarios de Instagram y Facebook, ignora los propios", () => {
    expect(commentFromChange("instagram", { field: "comments", value: { id: "C1", text: "Precio?", from: { id: "U1", username: "sofi" }, media: { id: "M1" } } }, "ME"))
      .toMatchObject({ channel: "INSTAGRAM", externalId: "C1", authorName: "@sofi", postId: "M1", body: "Precio?" });
    expect(commentFromChange("instagram", { field: "comments", value: { id: "C2", text: "Gracias!", from: { id: "ME" } } }, "ME")).toBeNull();
    expect(commentFromChange("page", { field: "feed", value: { item: "comment", verb: "add", comment_id: "P_C3", post_id: "P", parent_id: "P", message: "¿Envían a Acacías?", from: { id: "U3", name: "Marta" }, created_time: 1795000000 } }, "PAGE"))
      .toMatchObject({ channel: "FACEBOOK", externalId: "P_C3", parentId: null, authorName: "Marta" });
    expect(commentFromChange("page", { field: "feed", value: { item: "reaction", verb: "add" } })).toBeNull();
    expect(fallbackSuggestion("precio por dm porfa").tipo).toBe("interes");
    expect(fallbackSuggestion("pésimo servicio").tipo).toBe("negativo");
    expect(fallbackSuggestion("qué hermoso 😍").tipo).toBe("elogio");
  });

  it("entra por el aviso de Meta, se responde en público por la API y no se responde dos veces", async () => {
    const s = await setup("cm1");
    await saveIntegration(s.admin.actor, "company", "META", { pageId: "123456789012345", pageAccessToken: "page-token", appSecret: "app-secret" });
    const token = await tokenOf(s.company.id, "META");
    const body = JSON.stringify({ object: "instagram", entry: [{ id: "17841400000000000", changes: [{ field: "comments", value: { id: "IGC1", text: "Precio por DM", from: { id: "U9", username: "sofi" }, media: { id: "M9" } } }] }] });
    const r = await handleMetaEvent(token, body, sign(body, "app-secret"));
    expect(r.analyze?.commentIds).toHaveLength(1);
    // El mismo aviso dos veces no duplica el comentario.
    expect((await handleMetaEvent(token, body, sign(body, "app-secret"))).analyze?.commentIds).toHaveLength(0);
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const f = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)), auth: new Headers(init?.headers).get("authorization") });
      return json(200, { id: "REPLY1" });
    }) as typeof fetch;
    const id = r.analyze!.commentIds![0]!;
    await replyComment(s.admin.actor, id, "publico", "¡Hola! Te escribimos por privado 😊", f);
    expect(calls[0]).toMatchObject({ url: expect.stringMatching(/\/IGC1\/replies$/), body: { message: "¡Hola! Te escribimos por privado 😊" }, auth: "Bearer page-token" });
    expect(await code(replyComment(s.admin.actor, id, "publico", "otra vez", f))).toBe("CONFLICT");
    expect((await listComments(s.admin.actor, "REPLIED")).rows).toHaveLength(1);
    // Otra empresa no lo ve ni lo responde.
    const other = await setup("cm1b");
    expect(await code(ignoreComment(other.admin.actor, id))).toBe("NOT_FOUND");
    expect((await listComments(other.admin.actor, "REPLIED")).rows).toHaveLength(0);
  });
});

describe("demostración (sin conectar nada)", () => {
  it("carga chats por anuncios, comentarios e IA; nada sale a una plataforma; se borra entera", async () => {
    const s = await setup("demo1");
    const r = await loadDemo(s.admin.actor);
    expect(r.chats).toBeGreaterThanOrEqual(5);
    expect(await hasDemo(s.admin.actor)).toBe(true);
    const list = await listConversations(s.admin.actor);
    expect(list.conversations.every((c) => c.demo)).toBe(true);
    expect(list.conversations.filter((c) => c.ad).length).toBeGreaterThanOrEqual(3);
    // La IA (sin llave de Claude: reglas de demostración) analizó y marcó el reclamo para una persona.
    const reclamo = list.conversations.find((c) => c.customer === "Carlos Pérez")!;
    expect(reclamo).toMatchObject({ needsHuman: true, aiTag: "reclamo" });
    const alerts = await inboxAlerts(s.admin.actor);
    expect(alerts.needsHuman).toBeGreaterThanOrEqual(1);
    expect(alerts.adsToday).toBeGreaterThanOrEqual(1);
    expect(alerts.comments).toBe(4);
    expect((await adsReport(s.admin.actor)).total.won).toBeGreaterThanOrEqual(1);

    // Responder un chat de demostración no llama a ninguna API.
    const andres = list.conversations.find((c) => c.customer === "Andrés Rojas")!;
    const never = (async () => { throw new Error("no debe llamar"); }) as unknown as typeof fetch;
    await sendReply(s.admin.actor, andres.id, "¡Hola! Te paso los precios", never);
    expect((await getConversation(s.admin.actor, andres.id)).messages.at(-1)).toMatchObject({ status: "DELIVERED", body: "¡Hola! Te paso los precios" });

    // Respuesta automática: al escribir como cliente, la IA responde sola (no en reclamos).
    await setAutoReply(s.admin.actor, true);
    const sim = await simulateCustomer(s.admin.actor, andres.id, "¿y hacen domicilios? quiero pedir");
    expect(sim).toMatchObject({ analyzed: true, sent: true });
    expect((await getConversation(s.admin.actor, andres.id)).messages.at(-1)).toMatchObject({ direction: "OUT", origin: "AI" });
    await resolveHuman(s.admin.actor, reclamo.id);
    expect((await getConversation(s.admin.actor, reclamo.id)).ai.needsHuman).toBe(false);

    // Comentario por privado: abre un chat en la bandeja.
    const pending = (await listComments(s.admin.actor)).rows.find((c) => c.aiType === "interes")!;
    expect(pending.aiSuggestion).toBeTruthy();
    const priv = await replyComment(s.admin.actor, pending.id, "privado", "¡Hola! Te cuento por aquí", never);
    expect(priv.conversationId).toBeTruthy();

    // Solo los chats de demostración aceptan «escribir como el cliente».
    await clearDemo(s.admin.actor);
    expect(await hasDemo(s.admin.actor)).toBe(false);
    expect(await db.conversation.count({ where: { companyId: s.company.id } })).toBe(0);
    expect(await db.socialComment.count({ where: { companyId: s.company.id } })).toBe(0);
    expect(await db.customer.count({ where: { companyId: s.company.id, source: "DEMO" } })).toBe(0);
  });

  it("no toca chats reales ni de otra empresa", async () => {
    const s = await setup("demo2");
    const real = await db.customer.create({ data: { companyId: s.company.id, name: "Cliente real", phone: "3009990101" } });
    await loadDemo(s.admin.actor);
    await clearDemo(s.admin.actor);
    // El cliente real con el mismo celular de un chat de demostración sigue ahí.
    expect(await db.customer.findUnique({ where: { id: real.id } })).not.toBeNull();
    const other = await setup("demo2b");
    await loadDemo(other.admin.actor);
    expect(await hasDemo(s.admin.actor)).toBe(false);
    const c = (await listConversations(other.admin.actor)).conversations[0]!;
    expect(await code(simulateCustomer(s.admin.actor, c.id, "hola"))).toBe("NOT_FOUND");
  });

  it("reglas de la IA de demostración", () => {
    expect(demoAnalysis("Ya les hice la transferencia por Nequi", "Laura Gómez")).toMatchObject({ etiqueta: "pago", atender_persona: true });
    expect(demoAnalysis("¿Cuánto vale?", "Andrés Rojas")).toMatchObject({ etiqueta: "precio", atender_persona: false });
    expect(demoAnalysis("quiero agendar una cita", "@valen")).toMatchObject({ etiqueta: "cita" });
  });
});
