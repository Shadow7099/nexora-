import "server-only";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/**
 * CRM (marca blanca: cada empresa el suyo): clientes, oportunidades por etapa
 * del embudo y seguimientos. Los leads que llegan de Meta, WhatsApp o
 * formularios entran por ingestLead (sin usuario: desde los webhooks).
 */

export const STAGES = ["NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = { NEW: "Nuevo", CONTACTED: "Contactado", PROPOSAL: "Propuesta", NEGOTIATION: "Negociación", WON: "Ganado", LOST: "Perdido" };
export const OPEN_STAGES: Stage[] = ["NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION"];
export const SOURCE_LABEL: Record<string, string> = { MANUAL: "Manual", SALE: "Venta", META: "Facebook / Instagram", WHATSAPP: "WhatsApp", TIKTOK: "TikTok", WEB: "Formulario web" };
export const ACTIVITY_TYPES = ["NOTE", "CALL", "WHATSAPP", "EMAIL", "MEETING", "TASK"] as const;
export const ACTIVITY_LABEL: Record<string, string> = { NOTE: "Nota", CALL: "Llamada", WHATSAPP: "WhatsApp", EMAIL: "Correo", MEETING: "Reunión", TASK: "Tarea", STAGE: "Cambio de etapa", LEAD: "Lead recibido" };

const DOC_TYPES = ["NIT", "CC", "CE", "PASAPORTE", "PPT", "OTRO"] as const;
const optional = (s: z.ZodType<string>) => s.optional().or(z.literal("")).transform((v) => (v ? v : null));

/** Celular solo con dígitos; en Colombia sin el 57 inicial (3001234567). */
export function normalizePhone(raw: string | null | undefined) {
  const d = (raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  return d.length === 12 && d.startsWith("57") ? d.slice(2) : d;
}

export const customerFormSchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe el nombre." }).max(120),
  documentType: z.enum(DOC_TYPES).optional().or(z.literal("")).transform((v) => v || null),
  documentNumber: optional(z.string().trim().max(20).regex(/^[A-Za-z0-9-]+$/, { error: "Solo letras, números y guion." })),
  email: optional(z.email({ error: "Correo inválido." }).trim().toLowerCase().max(120)),
  phone: optional(z.string().trim().regex(/^[0-9+ ()-]{7,20}$/, { error: "Teléfono inválido." })),
  city: optional(z.string().trim().max(60)),
  address: optional(z.string().trim().max(120)),
  notes: optional(z.string().trim().max(1000)),
  marketingConsent: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional().transform((v) => v === true || v === "on" || v === "true"),
});

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(r.error));
  return r.data;
}

const duplicateDoc = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// ───────────────────────────── Clientes ─────────────────────────────

export async function createCustomer(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const v = parse(customerFormSchema, input);
  if (v.documentNumber && !v.documentType) throw new AppError("VALIDATION", "Revisa los campos marcados.", { documentType: "Elige el tipo de documento." });
  const { marketingConsent, ...data } = v;
  try {
    return await db.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: { ...data, phone: normalizePhone(data.phone), companyId, source: "MANUAL", marketingConsent, consentAt: marketingConsent ? new Date() : null, consentSource: marketingConsent ? "Registrada por la empresa" : null },
      });
      await audit({ companyId, actorUserId: actor.userId, action: "customer.create", entityType: "customer", entityId: c.id, after: { name: c.name } }, tx);
      return c;
    });
  } catch (e) {
    if (duplicateDoc(e)) throw new AppError("CONFLICT", "Ya hay un cliente con ese documento.", { documentNumber: "Ya existe." });
    throw e;
  }
}

async function ownCustomer(companyId: string, id: string) {
  if (!z.uuid().safeParse(id).success) throw notFound("El cliente");
  const c = await db.customer.findFirst({ where: { id, companyId } });
  if (!c) throw notFound("El cliente");
  return c;
}

export async function updateCustomer(actor: Actor, id: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const before = await ownCustomer(companyId, id);
  const v = parse(customerFormSchema, input);
  if (v.documentNumber && !v.documentType) throw new AppError("VALIDATION", "Revisa los campos marcados.", { documentType: "Elige el tipo de documento." });
  const { marketingConsent, ...data } = v;
  const consentChange = marketingConsent !== before.marketingConsent;
  try {
    await db.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: {
          ...data, phone: normalizePhone(data.phone), marketingConsent,
          ...(consentChange ? { consentAt: marketingConsent ? new Date() : null, consentSource: marketingConsent ? "Registrada por la empresa" : null } : {}),
        },
      });
      await audit({ companyId, actorUserId: actor.userId, action: "customer.update", entityType: "customer", entityId: id, after: { name: v.name, ...(consentChange ? { marketingConsent } : {}) } }, tx);
    });
  } catch (e) {
    if (duplicateDoc(e)) throw new AppError("CONFLICT", "Ya hay un cliente con ese documento.", { documentNumber: "Ya existe." });
    throw e;
  }
}

const listSchema = z.object({ q: z.string().trim().max(80).optional().catch(undefined), origen: z.string().max(20).optional().catch(undefined) });

export async function listCustomers(actor: Actor, raw: Record<string, unknown> = {}) {
  const companyId = requireCompanyAdmin(actor);
  const f = listSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v ? v : undefined])));
  const phone = normalizePhone(f.q);
  const customers = await db.customer.findMany({
    where: {
      companyId,
      ...(f.origen ? { source: f.origen } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }, { documentNumber: { contains: f.q } }, ...(phone && phone.length >= 4 ? [{ phone: { contains: phone } }] : [])] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
    include: { _count: { select: { deals: { where: { stage: { in: OPEN_STAGES } } }, sales: { where: { status: "COMPLETED" } } } } },
  });
  return {
    filters: f,
    customers: customers.map((c) => ({
      id: c.id, name: c.name, phone: c.phone, email: c.email, source: c.source, marketingConsent: c.marketingConsent, updatedAt: c.updatedAt,
      openDeals: c._count.deals, sales: c._count.sales,
    })),
  };
}

export async function getCustomer(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  const c = await ownCustomer(companyId, id);
  const [deals, activities, sales, users] = await Promise.all([
    db.deal.findMany({ where: { companyId, customerId: id }, orderBy: { createdAt: "desc" }, include: { owner: { select: { name: true } } } }),
    db.crmActivity.findMany({ where: { companyId, customerId: id }, orderBy: { createdAt: "desc" }, take: 100, include: { createdBy: { select: { name: true } }, deal: { select: { title: true } } } }),
    db.sale.aggregate({ where: { companyId, customerId: id, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
    companyUsers(companyId),
  ]);
  return {
    customer: c,
    deals: deals.map((d) => ({ id: d.id, title: d.title, value: d.value == null ? null : Number(d.value), stage: d.stage as Stage, source: d.source, owner: d.owner?.name ?? null, createdAt: d.createdAt, lostReason: d.lostReason })),
    activities: activities.map((a) => ({ id: a.id, type: a.type, body: a.body, dueAt: a.dueAt, doneAt: a.doneAt, by: a.createdBy?.name ?? "Automático", at: a.createdAt, deal: a.deal?.title ?? null })),
    sales: { count: sales._count._all, total: Number(sales._sum.total ?? 0) },
    users,
  };
}

/** Usuarios que pueden ser responsables de una oportunidad (administradores de la empresa). */
async function companyUsers(companyId: string) {
  return db.user.findMany({ where: { companyId, role: "COMPANY_ADMIN", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

// ───────────────────────────── Oportunidades ─────────────────────────────

export const dealSchema = z.object({
  customerId: z.uuid({ error: "Elige el cliente." }),
  title: z.string().trim().min(3, { error: "Describe la oportunidad (p. ej. Pedido para evento)." }).max(120),
  value: z.union([z.literal(""), z.coerce.number({ error: "Valor inválido." }).min(0).max(1_000_000_000_000)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  expectedClose: optional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." })),
  ownerId: optional(z.uuid()),
});

export async function createDeal(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const v = parse(dealSchema, input);
  await ownCustomer(companyId, v.customerId);
  if (v.ownerId && !(await db.user.findFirst({ where: { id: v.ownerId, companyId, role: "COMPANY_ADMIN" } }))) throw new AppError("VALIDATION", "Revisa los campos marcados.", { ownerId: "Elige un responsable de tu empresa." });
  return db.$transaction(async (tx) => {
    const d = await tx.deal.create({
      data: { companyId, customerId: v.customerId, title: v.title, value: v.value, expectedClose: v.expectedClose ? new Date(`${v.expectedClose}T00:00:00Z`) : null, ownerId: v.ownerId ?? actor.userId, source: "MANUAL" },
    });
    await audit({ companyId, actorUserId: actor.userId, action: "deal.create", entityType: "deal", entityId: d.id, after: { title: d.title, value: v.value } }, tx);
    return d;
  });
}

/** Mueve la oportunidad de etapa; ganada o perdida la cierra. Perdida exige el motivo. */
export async function moveDeal(actor: Actor, id: string, stage: unknown, lostReason?: unknown) {
  const companyId = requireCompanyAdmin(actor);
  if (!STAGES.includes(stage as Stage)) throw new AppError("VALIDATION", "Etapa no válida.");
  const to = stage as Stage;
  if (!z.uuid().safeParse(id).success) throw notFound("La oportunidad");
  const d = await db.deal.findFirst({ where: { id, companyId } });
  if (!d) throw notFound("La oportunidad");
  if (d.stage === to) return;
  const why = typeof lostReason === "string" ? lostReason.trim() : "";
  if (to === "LOST" && why.length < 3) throw new AppError("VALIDATION", "Escribe por qué se perdió.", { lostReason: "Escribe el motivo." });
  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id },
      data: { stage: to, closedAt: to === "WON" || to === "LOST" ? new Date() : null, lostReason: to === "LOST" ? why.slice(0, 300) : null },
    });
    await tx.crmActivity.create({
      data: { companyId, customerId: d.customerId, dealId: id, type: "STAGE", body: `«${d.title}»: ${STAGE_LABEL[d.stage as Stage]} → ${STAGE_LABEL[to]}${to === "LOST" ? ` (${why})` : ""}`, createdById: actor.userId },
    });
    await audit({ companyId, actorUserId: actor.userId, action: "deal.stage", entityType: "deal", entityId: id, before: { stage: d.stage }, after: { stage: to } }, tx);
  });
}

/** Embudo: oportunidades abiertas por etapa y las cerradas de los últimos 30 días. */
export async function pipeline(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const deals = await db.deal.findMany({
    where: { companyId, OR: [{ stage: { in: OPEN_STAGES } }, { closedAt: { gte: since } }] },
    orderBy: { updatedAt: "desc" },
    include: { customer: { select: { name: true, phone: true } }, owner: { select: { name: true } } },
  });
  const columns = STAGES.map((stage) => {
    const items = deals.filter((d) => d.stage === stage).map((d) => ({
      id: d.id, title: d.title, value: d.value == null ? null : Number(d.value), customerId: d.customerId, customer: d.customer.name, phone: d.customer.phone,
      source: d.source, owner: d.owner?.name ?? null, updatedAt: d.updatedAt,
    }));
    return { stage, label: STAGE_LABEL[stage], items, total: items.reduce((a, i) => a + (i.value ?? 0), 0) };
  });
  const won = columns.find((c) => c.stage === "WON")!.items.length;
  const lost = columns.find((c) => c.stage === "LOST")!.items.length;
  return { columns, winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null, openValue: columns.filter((c) => OPEN_STAGES.includes(c.stage)).reduce((a, c) => a + c.total, 0) };
}

// ───────────────────────────── Seguimientos ─────────────────────────────

export const activitySchema = z.object({
  customerId: z.uuid({ error: "Cliente inválido." }),
  dealId: optional(z.uuid()),
  type: z.enum(ACTIVITY_TYPES, { error: "Elige el tipo." }),
  body: z.string().trim().min(2, { error: "Escribe el detalle." }).max(2000),
  dueAt: optional(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: "Fecha y hora inválidas." })),
});

/** Registra una nota, llamada, mensaje, reunión o tarea (las tareas llevan fecha). */
export async function addActivity(actor: Actor, input: unknown, timeZoneOffsetHours = -5) {
  const companyId = requireCompanyAdmin(actor);
  const v = parse(activitySchema, input);
  await ownCustomer(companyId, v.customerId);
  if (v.dealId && !(await db.deal.findFirst({ where: { id: v.dealId, companyId, customerId: v.customerId } }))) throw new AppError("VALIDATION", "Revisa los campos marcados.", { dealId: "Elige una oportunidad de este cliente." });
  if (v.type === "TASK" && !v.dueAt) throw new AppError("VALIDATION", "Revisa los campos marcados.", { dueAt: "Una tarea necesita fecha y hora." });
  // La hora se escribe en hora de Colombia (UTC−5).
  const dueAt = v.dueAt ? new Date(Date.parse(`${v.dueAt}:00Z`) - timeZoneOffsetHours * 3_600_000) : null;
  return db.$transaction(async (tx) => {
    const a = await tx.crmActivity.create({ data: { companyId, customerId: v.customerId, dealId: v.dealId, type: v.type, body: v.body, dueAt, createdById: actor.userId } });
    await tx.customer.update({ where: { id: v.customerId }, data: { updatedAt: new Date() } });
    return a;
  });
}

export async function completeActivity(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La tarea");
  const r = await db.crmActivity.updateMany({ where: { id, companyId, type: "TASK", doneAt: null }, data: { doneAt: new Date() } });
  if (r.count !== 1) throw notFound("La tarea");
}

/** Tareas pendientes (vencidas y de los próximos 7 días). */
export async function pendingTasks(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const tasks = await db.crmActivity.findMany({
    where: { companyId, type: "TASK", doneAt: null, dueAt: { lte: new Date(now.getTime() + 7 * 86_400_000) } },
    orderBy: { dueAt: "asc" },
    take: 50,
    include: { customer: { select: { name: true } } },
  });
  return tasks.map((t) => ({ id: t.id, body: t.body, dueAt: t.dueAt!, overdue: t.dueAt! < now, customerId: t.customerId, customer: t.customer.name }));
}

// ───────────────────────────── Leads entrantes ─────────────────────────────

export const leadSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.email().trim().toLowerCase().max(120).optional().or(z.literal("")).transform((v) => v || null),
  phone: z.string().trim().max(30).optional().transform((v) => normalizePhone(v)),
  message: z.string().trim().max(2000).optional(),
  campaign: z.string().trim().max(120).optional(),
  consent: z.boolean().optional(),
});
export type LeadInput = z.input<typeof leadSchema> & { externalId?: string | null; activityType?: "LEAD" | "WHATSAPP" };

/**
 * Registra un lead que llega de afuera (sin usuario). Reconoce al cliente por
 * celular o correo; si no existe lo crea. Abre una oportunidad «Nuevo» si no
 * tiene una abierta y deja el mensaje en sus seguimientos. Un mismo lead
 * (externalId) no se registra dos veces.
 */
export async function ingestLead(companyId: string, source: string, input: LeadInput) {
  const v = leadSchema.parse(input);
  if (!v.phone && !v.email) throw new AppError("VALIDATION", "El lead necesita al menos un celular o un correo.");
  const name = v.name || v.email || (v.phone ? `Cliente ${v.phone}` : "Cliente");
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lead:${companyId}:${v.phone ?? v.email}`}))`;
      if (input.externalId && (await tx.crmActivity.findFirst({ where: { companyId, externalId: input.externalId } }))) return { duplicate: true as const };
      let customer = await tx.customer.findFirst({
        where: { companyId, OR: [...(v.phone ? [{ phone: v.phone }] : []), ...(v.email ? [{ email: v.email }] : [])] },
        orderBy: { createdAt: "asc" },
      });
      const consent = v.consent ? { marketingConsent: true, consentAt: new Date(), consentSource: `Formulario de ${SOURCE_LABEL[source] ?? source}` } : {};
      if (!customer) {
        customer = await tx.customer.create({ data: { companyId, name, phone: v.phone, email: v.email, source, ...consent } });
      } else {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { phone: customer.phone ?? v.phone, email: customer.email ?? v.email, ...(customer.marketingConsent ? {} : consent) },
        });
      }
      let deal = await tx.deal.findFirst({ where: { companyId, customerId: customer.id, stage: { in: OPEN_STAGES } }, orderBy: { createdAt: "desc" } });
      const newDeal = !deal;
      if (!deal) {
        deal = await tx.deal.create({ data: { companyId, customerId: customer.id, title: v.campaign ? `${SOURCE_LABEL[source] ?? source}: ${v.campaign}` : `Lead de ${SOURCE_LABEL[source] ?? source}`, source } });
      }
      await tx.crmActivity.create({
        data: {
          companyId, customerId: customer.id, dealId: deal.id, type: input.activityType ?? "LEAD", externalId: input.externalId ?? null,
          body: [v.message, v.campaign ? `Campaña: ${v.campaign}` : null].filter(Boolean).join("\n") || `Lead recibido desde ${SOURCE_LABEL[source] ?? source}.`,
        },
      });
      await audit({ companyId, actorUserId: null, action: "crm.lead", entityType: "customer", entityId: customer.id, after: { source, newDeal } }, tx);
      return { duplicate: false as const, customerId: customer.id, dealId: deal.id, newDeal };
    });
  } catch (e) {
    // Dos avisos simultáneos del mismo lead: el índice único deja pasar solo uno.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && input.externalId) return { duplicate: true as const };
    throw e;
  }
}
