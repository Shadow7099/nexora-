/**
 * CRM: clientes, embudo, seguimientos y leads entrantes (Meta, WhatsApp y la
 * entrada genérica), con firma de Meta verificada, sin duplicados y aislamiento.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  addActivity, completeActivity, createCustomer, createDeal, getCustomer, ingestLead, listCustomers, moveDeal, normalizePhone, pendingTasks, pipeline, updateCustomer,
} from "@/server/crm";
import { handleGenericLead, handleMetaEvent, handleWhatsappEvent, leadFromMetaFields, validMetaSignature, verifySubscription } from "@/server/crm-webhooks";
import { AppError } from "@/server/errors";
import { saveIntegration } from "@/server/integrations";
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

async function setup(tag: string) {
  const f = await makeCompany(tag);
  return { ...f, admin: await login(f.admin.email), emp: await login(f.empUser.email) };
}
const tokenOf = async (companyId: string, provider: string) => (await db.integration.findFirstOrThrow({ where: { companyId, provider } })).webhookToken;

describe("utilidades", () => {
  it("normaliza celulares y lee los campos de un formulario de Meta", () => {
    expect(normalizePhone("+57 300 123 4567")).toBe("3001234567");
    expect(normalizePhone("573001234567")).toBe("3001234567");
    expect(normalizePhone("(1) 555-0100")).toBe("15550100");
    expect(normalizePhone("")).toBeNull();
    expect(leadFromMetaFields([
      { name: "full_name", values: ["Ana Ruiz"] }, { name: "email", values: ["ana@correo.co"] }, { name: "phone_number", values: ["+573001112233"] },
      { name: "¿qué_te_interesa?", values: ["Tortas para eventos"] },
    ])).toEqual({ name: "Ana Ruiz", email: "ana@correo.co", phone: "+573001112233", message: "¿qué te interesa?: Tortas para eventos" });
    expect(leadFromMetaFields([{ name: "first_name", values: ["Ana"] }, { name: "last_name", values: ["Ruiz"] }]).name).toBe("Ana Ruiz");
    expect(validMetaSignature("{}", sign("{}", "s3cr3t"), "s3cr3t")).toBe(true);
    expect(validMetaSignature("{}", sign("{}", "otra"), "s3cr3t")).toBe(false);
    expect(validMetaSignature("{}", null, "s3cr3t")).toBe(false);
    expect(validMetaSignature("{}", sign("{}", "s3cr3t"), undefined)).toBe(false);
  });
});

describe("clientes, embudo y seguimientos", () => {
  it("crea y edita clientes; la autorización comercial queda fechada", async () => {
    const s = await setup("crm1");
    const c = await createCustomer(s.admin.actor, { name: "Rosa Pérez", phone: "+57 300 123 4567", email: "ROSA@correo.co", marketingConsent: "on" });
    expect(c).toMatchObject({ phone: "3001234567", email: "rosa@correo.co", marketingConsent: true, source: "MANUAL" });
    expect(c.consentAt).toBeInstanceOf(Date);
    await expect(createCustomer(s.admin.actor, { name: "X" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createCustomer(s.admin.actor, { name: "Doc sin tipo", documentNumber: "123" })).rejects.toMatchObject({ fieldErrors: { documentType: expect.any(String) } });
    await updateCustomer(s.admin.actor, c.id, { name: "Rosa Pérez Gómez", phone: "3001234567", email: "rosa@correo.co" });
    const after = await db.customer.findUniqueOrThrow({ where: { id: c.id } });
    expect(after).toMatchObject({ name: "Rosa Pérez Gómez", marketingConsent: false, consentAt: null });
    expect((await listCustomers(s.admin.actor, { q: "300 123" })).customers.map((x) => x.id)).toEqual([c.id]);
    expect((await listCustomers(s.admin.actor, { q: "rosa@" })).customers).toHaveLength(1);
  });

  it("oportunidades por etapa; perder exige motivo; cada cambio queda en el historial", async () => {
    const s = await setup("crm2");
    const c = await createCustomer(s.admin.actor, { name: "Hotel Llano" });
    const d = await createDeal(s.admin.actor, { customerId: c.id, title: "Pan para desayunos", value: "1200000", expectedClose: "2026-12-15" });
    expect(d).toMatchObject({ stage: "NEW", ownerId: s.admin.actor.userId });
    await moveDeal(s.admin.actor, d.id, "PROPOSAL");
    await expect(moveDeal(s.admin.actor, d.id, "LOST")).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(moveDeal(s.admin.actor, d.id, "CERRADO")).rejects.toMatchObject({ code: "VALIDATION" });
    const d2 = await createDeal(s.admin.actor, { customerId: c.id, title: "Tortas de cumpleaños", value: "300000" });
    await moveDeal(s.admin.actor, d2.id, "WON");
    await moveDeal(s.admin.actor, d.id, "LOST", "Eligió otro proveedor");
    const p = await pipeline(s.admin.actor);
    expect(p.columns.find((x) => x.stage === "WON")!.items.map((i) => i.title)).toEqual(["Tortas de cumpleaños"]);
    expect(p.columns.find((x) => x.stage === "LOST")!.items).toHaveLength(1);
    expect(p).toMatchObject({ winRate: 50, openValue: 0 });
    const detail = await getCustomer(s.admin.actor, c.id);
    expect(detail.activities.filter((a) => a.type === "STAGE").map((a) => a.body)).toContain("«Pan para desayunos»: Propuesta → Perdido (Eligió otro proveedor)");
    expect(detail.deals.find((x) => x.id === d.id)).toMatchObject({ stage: "LOST", lostReason: "Eligió otro proveedor" });
  });

  it("tareas con fecha: pendientes, vencidas y completadas", async () => {
    const s = await setup("crm3");
    const c = await createCustomer(s.admin.actor, { name: "Colegio" });
    await expect(addActivity(s.admin.actor, { customerId: c.id, type: "TASK", body: "Llamar" })).rejects.toMatchObject({ fieldErrors: { dueAt: expect.any(String) } });
    const t = await addActivity(s.admin.actor, { customerId: c.id, type: "TASK", body: "Llamar para cotizar", dueAt: "2026-11-18T09:00" });
    expect(t.dueAt!.toISOString()).toBe("2026-11-18T14:00:00.000Z"); // 9:00 a. m. Colombia
    await addActivity(s.admin.actor, { customerId: c.id, type: "NOTE", body: "Prefiere WhatsApp" });
    const tasks = await pendingTasks(s.admin.actor, new Date("2026-11-18T20:00:00Z"));
    expect(tasks).toMatchObject([{ body: "Llamar para cotizar", overdue: true, customer: "Colegio" }]);
    await completeActivity(s.admin.actor, t.id);
    expect(await pendingTasks(s.admin.actor, new Date("2026-11-18T20:00:00Z"))).toHaveLength(0);
    expect(await code(completeActivity(s.admin.actor, t.id))).toBe("NOT_FOUND");
  });
});

describe("leads entrantes", () => {
  it("reconoce al cliente por celular o correo, abre una oportunidad y no duplica el mismo lead", async () => {
    const s = await setup("crm4");
    const a = await ingestLead(s.company.id, "TIKTOK", { name: "Luisa", phone: "+57 310 555 0000", message: "Quiero cotizar", campaign: "Navidad", externalId: "tiktok:1" });
    expect(a).toMatchObject({ duplicate: false, newDeal: true });
    expect(await ingestLead(s.company.id, "TIKTOK", { phone: "3105550000", externalId: "tiktok:1" })).toEqual({ duplicate: true });
    // Mismo celular por otro canal: mismo cliente, misma oportunidad abierta.
    const b = await ingestLead(s.company.id, "WHATSAPP", { phone: "573105550000", message: "Hola", externalId: "wa:x", activityType: "WHATSAPP" });
    expect(b).toMatchObject({ customerId: (a as { customerId: string }).customerId, newDeal: false });
    const detail = await getCustomer(s.admin.actor, (a as { customerId: string }).customerId);
    expect(detail.customer).toMatchObject({ name: "Luisa", source: "TIKTOK", phone: "3105550000" });
    expect(detail.deals).toMatchObject([{ title: "TikTok: Navidad", stage: "NEW", source: "TIKTOK" }]);
    expect(detail.activities.map((x) => x.type).sort()).toEqual(["LEAD", "WHATSAPP"]);
    await expect(ingestLead(s.company.id, "WEB", { name: "Sin contacto" })).rejects.toMatchObject({ code: "VALIDATION" });
    // Si la oportunidad se cerró, un lead nuevo abre otra.
    await moveDeal(s.admin.actor, (a as { dealId: string }).dealId, "WON");
    expect(await ingestLead(s.company.id, "WEB", { email: "nuevo@correo.co", phone: "3105550000" })).toMatchObject({ newDeal: true });
  });

  it("entrada genérica: token privado de la empresa, JSON validado", async () => {
    const s = await setup("crm5");
    await saveIntegration(s.admin.actor, "company", "LEADS", {});
    const token = await tokenOf(s.company.id, "LEADS");
    expect(await handleGenericLead("token-que-no-existe-0000000", "{}")).toMatchObject({ status: 404 });
    expect(await handleGenericLead(token, "no es json")).toMatchObject({ status: 400 });
    expect(await handleGenericLead(token, JSON.stringify({ name: "Sin datos" }))).toMatchObject({ status: 400 });
    const r = await handleGenericLead(token, JSON.stringify({ name: "Pedro", phone: "3201112233", source: "TIKTOK", campaign: "Lanzamiento", id: "777" }));
    expect(r).toMatchObject({ status: 200 });
    expect(JSON.parse(r.body)).toEqual({ ok: true, newDeal: true });
    expect(JSON.parse((await handleGenericLead(token, JSON.stringify({ phone: "3201112233", source: "TIKTOK", id: "777" }))).body)).toEqual({ ok: true, duplicate: true });
    expect(await db.customer.count({ where: { companyId: s.company.id, source: "TIKTOK" } })).toBe(1);
  });

  it("Meta: verifica la suscripción y la firma; trae el lead de la API con el token de la página", async () => {
    const s = await setup("crm6");
    await saveIntegration(s.admin.actor, "company", "META", { pageId: "123456789012345", pageAccessToken: "EAAG-page", appSecret: "app-secret" });
    const token = await tokenOf(s.company.id, "META");
    const q = (vt: string) => new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": vt, "hub.challenge": "12345" });
    expect(await verifySubscription("META", token, q(token))).toMatchObject({ status: 200, body: "12345" });
    expect(await verifySubscription("META", token, q("otro"))).toMatchObject({ status: 403 });

    const body = JSON.stringify({ object: "page", entry: [{ changes: [{ field: "leadgen", value: { leadgen_id: "4444444444", page_id: "123456789012345" } }] }] });
    const calls: { url: string; auth: string | null }[] = [];
    const graph = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), auth: new Headers(init?.headers).get("authorization") });
      return new Response(JSON.stringify({ field_data: [{ name: "full_name", values: ["Ana Ruiz"] }, { name: "phone_number", values: ["+573001112233"] }], campaign_name: "Tortas" }), { status: 200 });
    }) as typeof fetch;
    expect(await handleMetaEvent(token, body, sign(body, "otra-clave"), graph)).toMatchObject({ status: 401 });
    expect(calls).toHaveLength(0);
    expect(await handleMetaEvent(token, body, sign(body, "app-secret"), graph)).toMatchObject({ status: 200 });
    expect(calls[0]).toMatchObject({ url: expect.stringContaining("/4444444444?fields=field_data"), auth: "Bearer EAAG-page" });
    const c = await db.customer.findFirstOrThrow({ where: { companyId: s.company.id, source: "META" } });
    expect(c).toMatchObject({ name: "Ana Ruiz", phone: "3001112233", marketingConsent: true, consentSource: "Formulario de Facebook / Instagram" });
    // Meta reintenta el mismo aviso: no se duplica.
    await handleMetaEvent(token, body, sign(body, "app-secret"), graph);
    expect(await db.crmActivity.count({ where: { companyId: s.company.id, type: "LEAD" } })).toBe(1);
  });

  it("WhatsApp: cada mensaje entra al historial del cliente, una sola vez", async () => {
    const s = await setup("crm7");
    await saveIntegration(s.admin.actor, "company", "WHATSAPP", { phoneNumberId: "100000000000000", businessAccountId: "100000000000001", accessToken: "wa", appSecret: "wa-secret" });
    const token = await tokenOf(s.company.id, "WHATSAPP");
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ value: { contacts: [{ wa_id: "573004445566", profile: { name: "Carlos" } }], messages: [{ id: "wamid.1", from: "573004445566", type: "text", text: { body: "¿Tienen pan integral?" } }] } }] }],
    });
    expect(await handleWhatsappEvent(token, body, null)).toMatchObject({ status: 401 });
    expect(await handleWhatsappEvent(token, body, sign(body, "wa-secret"))).toMatchObject({ status: 200 });
    expect(await handleWhatsappEvent(token, body, sign(body, "wa-secret"))).toMatchObject({ status: 200 });
    const acts = await db.crmActivity.findMany({ where: { companyId: s.company.id, type: "WHATSAPP" }, include: { customer: true } });
    expect(acts).toHaveLength(1);
    expect(acts[0]).toMatchObject({ body: "¿Tienen pan integral?", customer: { name: "Carlos", phone: "3004445566" } });
  });

  it("aislamiento: el token de una empresa solo crea leads en esa empresa; los datos no se cruzan", async () => {
    const a = await setup("crm8");
    const b = await setup("crm9");
    await saveIntegration(a.admin.actor, "company", "LEADS", {});
    await handleGenericLead(await tokenOf(a.company.id, "LEADS"), JSON.stringify({ name: "Lead A", phone: "3009998877" }));
    expect((await listCustomers(b.admin.actor)).customers).toHaveLength(0);
    const ca = await db.customer.findFirstOrThrow({ where: { companyId: a.company.id } });
    expect(await code(getCustomer(b.admin.actor, ca.id))).toBe("NOT_FOUND");
    expect(await code(createDeal(b.admin.actor, { customerId: ca.id, title: "Ajena" }))).toBe("NOT_FOUND");
    expect(await code(addActivity(b.admin.actor, { customerId: ca.id, type: "NOTE", body: "x y" }))).toBe("NOT_FOUND");
    const deal = await db.deal.findFirstOrThrow({ where: { companyId: a.company.id } });
    expect(await code(moveDeal(b.admin.actor, deal.id, "WON"))).toBe("NOT_FOUND");
    expect(await code(listCustomers(a.emp.actor))).toBe("FORBIDDEN");
    expect(await code(pipeline(a.emp.actor))).toBe("FORBIDDEN");
  });
});
