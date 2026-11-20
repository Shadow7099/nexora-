import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { sendToConversation, type ReplyButton } from "@/server/messages";
import type { Actor } from "@/server/sessions";

/**
 * Agenda con botones (como en Ámbar Couture): en el chat el cliente toca el
 * día (botones) y luego la hora (lista); la cita queda creada sin que nadie
 * escriba. Los horarios salen del horario de atención de la sede, en bloques
 * del largo configurado y con un cupo por bloque. La IA ofrece los horarios
 * sola cuando el cliente quiere agendar (con la respuesta automática encendida);
 * una persona también puede ofrecerlos o agendar desde el chat.
 */

const TZ = "America/Bogota";
const OFFSET = "-05:00"; // Colombia no tiene horario de verano.
const LEAD_MS = 60 * 60_000; // no se ofrecen horarios en la próxima hora
const SEARCH_DAYS = 21;
export const APPOINTMENT_STATUS_LABEL: Record<string, string> = { BOOKED: "Agendada", CONFIRMED: "Confirmada", ATTENDED: "Asistió", NO_SHOW: "No asistió", CANCELLED: "Cancelada" };
const ACTIVE = ["BOOKED", "CONFIRMED"];
export const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensMin: 8 * 60, closesMin: 18 * 60 }));

const localDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const addDays = (day: string, n: number) => localDay(new Date(new Date(`${day}T12:00:00${OFFSET}`).getTime() + n * 86_400_000));
const isoWeekday = (day: string) => ((new Date(`${day}T12:00:00${OFFSET}`).getUTCDay() + 6) % 7) + 1;
export const dayLabel = (day: string) => new Date(`${day}T12:00:00${OFFSET}`).toLocaleDateString("es-CO", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
export const timeLabel = (d: Date) => d.toLocaleTimeString("es-CO", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
export const whenLabel = (d: Date) => `${dayLabel(localDay(d))}, ${timeLabel(d)}`;

async function bookingSetup(companyId: string) {
  const cfg = await db.crmAiConfig.findUnique({ where: { companyId } });
  const sites = await db.site.findMany({
    where: { companyId, active: true, ...(cfg?.bookingSiteId ? { id: cfg.bookingSiteId } : {}) },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, address: true, openingHours: { select: { weekday: true, opensMin: true, closesMin: true } } },
  });
  const found = sites.find((s) => s.openingHours.length) ?? sites[0] ?? null;
  // Sede sin horario de atención: lunes a sábado de 8 a. m. a 6 p. m. hasta que lo configuren.
  const site = found && !found.openingHours.length ? { ...found, openingHours: DEFAULT_HOURS } : found;
  return { enabled: cfg?.bookingEnabled ?? true, slotMinutes: cfg?.slotMinutes ?? 60, capacity: cfg?.slotCapacity ?? 1, site };
}

/** Horarios libres por día, desde hoy (hora de Colombia), sin la próxima hora y sin bloques llenos. */
export async function availableSlots(companyId: string, now = new Date(), days = SEARCH_DAYS) {
  const s = await bookingSetup(companyId);
  if (!s.site) return { site: s.site, days: [] as { day: string; slots: Date[] }[] };
  const today = localDay(now);
  const until = new Date(`${addDays(today, days)}T23:59:59${OFFSET}`);
  const taken = await db.appointment.groupBy({ by: ["startsAt"], where: { companyId, status: { in: ACTIVE }, startsAt: { gte: now, lte: until } }, _count: { _all: true } });
  const full = new Set(taken.filter((t) => t._count._all >= s.capacity).map((t) => t.startsAt.getTime()));
  const out: { day: string; slots: Date[] }[] = [];
  for (let i = 0; i <= days; i++) {
    const day = addDays(today, i);
    const hours = s.site.openingHours.filter((h) => h.weekday === isoWeekday(day));
    const slots: Date[] = [];
    for (const h of hours) {
      for (let m = h.opensMin; m + s.slotMinutes <= h.closesMin; m += s.slotMinutes) {
        const at = new Date(`${day}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00${OFFSET}`);
        if (at.getTime() >= now.getTime() + LEAD_MS && !full.has(at.getTime())) slots.push(at);
      }
    }
    if (slots.length) out.push({ day, slots });
  }
  return { site: s.site, days: out };
}

type Conv = { id: string; companyId: string; channel: string; externalUser: string; lastInboundAt: Date | null; demo?: boolean; customerId: string };
type By = { origin: "NEXORA" | "AI"; userId: string | null };

/** Paso 1: botones con los próximos 3 días con horarios libres. */
export async function offerDays(conv: Conv, by: By, intro?: string, now = new Date(), f: typeof fetch = fetch) {
  const { site, days } = await availableSlots(conv.companyId, now);
  if (!site) throw new AppError("CONFLICT", "Crea una sede con horario de atención para poder agendar.");
  if (!days.length) {
    return sendToConversation(conv, `${intro ? `${intro}\n\n` : ""}Por ahora no tenemos horarios libres en ${site.name}. Una persona del equipo te escribe para buscarte un espacio.`, by, f, now);
  }
  const buttons: ReplyButton[] = days.slice(0, 3).map((d) => ({ id: `ag_d_${d.day}`, title: dayLabel(d.day) }));
  return sendToConversation(conv, `${intro ? `${intro}\n\n` : ""}¿Qué día te queda mejor para tu cita en ${site.name}? Toca una opción 👇`, by, f, now, buttons);
}

/** Paso 2: lista con las horas libres de ese día (hasta 9 y «Otro día»). */
async function offerHours(conv: Conv, day: string, now: Date, f: typeof fetch) {
  const { days } = await availableSlots(conv.companyId, now);
  const d = days.find((x) => x.day === day);
  const by: By = { origin: "AI", userId: null };
  if (!d) return offerDays(conv, by, `Ese día ya no tiene horarios libres.`, now, f);
  const buttons: ReplyButton[] = [
    ...d.slots.slice(0, 9).map((at) => ({ id: `ag_h_${at.toISOString()}`, title: timeLabel(at) })),
    { id: "ag_otro", title: "Otro día" },
  ];
  return sendToConversation(conv, `Estas son las horas libres del ${dayLabel(day)}. ¿Cuál prefieres?`, by, f, now, buttons);
}

/** Crea la cita si el bloque sigue libre (bloqueo por empresa y hora: dos clientes no toman el último cupo). */
export async function createAppointment(companyId: string, input: { customerId: string; startsAt: Date; conversationId?: string | null; source: "CHAT" | "AI" | "MANUAL"; notes?: string | null; userId?: string | null }) {
  const s = await bookingSetup(companyId);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cita:${companyId}:${input.startsAt.toISOString()}`}))`;
    const busy = await tx.appointment.count({ where: { companyId, startsAt: input.startsAt, status: { in: ACTIVE } } });
    if (busy >= s.capacity) throw new AppError("CONFLICT", "Ese horario ya se ocupó. Elige otro.");
    const a = await tx.appointment.create({
      data: {
        companyId, customerId: input.customerId, siteId: s.site?.id ?? null, conversationId: input.conversationId ?? null, startsAt: input.startsAt,
        durationMin: s.slotMinutes, source: input.source, notes: input.notes?.slice(0, 500) ?? null, createdById: input.userId ?? null,
      },
    });
    await tx.crmActivity.create({ data: { companyId, customerId: input.customerId, type: "NOTE", body: `Cita agendada${input.source === "MANUAL" ? "" : " desde el chat"}: ${whenLabel(input.startsAt)}${s.site ? ` en ${s.site.name}` : ""}.` } });
    await audit({ companyId, actorUserId: input.userId ?? null, action: "appointment.create", entityType: "appointment", entityId: a.id, after: { startsAt: input.startsAt.toISOString(), source: input.source } }, tx);
    return { appointment: a, site: s.site };
  });
}

/** Paso 3: el cliente tocó una hora → cita creada y confirmación en el chat. */
async function bookFromButton(conv: Conv, iso: string, now: Date, f: typeof fetch) {
  const at = new Date(iso);
  const by: By = { origin: "AI", userId: null };
  if (Number.isNaN(at.getTime()) || at.getTime() < now.getTime()) return offerDays(conv, by, "Esa hora ya pasó.", now, f);
  try {
    const { site } = await createAppointment(conv.companyId, { customerId: conv.customerId, startsAt: at, conversationId: conv.id, source: "CHAT" });
    return sendToConversation(conv, `✅ ¡Listo! Tu cita quedó para el ${whenLabel(at)}${site ? ` en ${site.name}${site.address ? ` (${site.address})` : ""}` : ""}. Si necesitas cambiarla, escríbenos por aquí.`, by, f, now);
  } catch (e) {
    if (e instanceof AppError && e.code === "CONFLICT") return offerDays(conv, by, "Ese horario se acaba de ocupar 😕", now, f);
    throw e;
  }
}

/** Respuesta de un botón de la agenda (ag_d_…, ag_h_…, ag_otro). Devuelve true si lo atendió la agenda. */
export async function handleBookingAction(companyId: string, conversationId: string, action: string, now = new Date(), f: typeof fetch = fetch) {
  if (!action.startsWith("ag_")) return false;
  const conv = await db.conversation.findFirst({ where: { id: conversationId, companyId } });
  if (!conv) return false;
  if (action.startsWith("ag_d_")) await offerHours(conv, action.slice(5), now, f);
  else if (action.startsWith("ag_h_")) await bookFromButton(conv, action.slice(5), now, f);
  else await offerDays(conv, { origin: "AI", userId: null }, undefined, now, f);
  return true;
}

// ───────────────────────────── Pantalla ─────────────────────────────

/** «Agendar con botones» desde el chat: envía los días disponibles. */
export async function offerDaysFromChat(actor: Actor, conversationId: string, now = new Date(), f: typeof fetch = fetch) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(conversationId).success) throw notFound("La conversación");
  const conv = await db.conversation.findFirst({ where: { id: conversationId, companyId } });
  if (!conv) throw notFound("La conversación");
  return offerDays(conv, { origin: "NEXORA", userId: actor.userId }, undefined, now, f);
}

/** Agendar a mano (desde el chat o la agenda) en un horario libre. */
export async function bookManually(actor: Actor, input: { conversationId?: unknown; customerId?: unknown; startsAt: unknown; notes?: unknown; notify?: boolean }, now = new Date(), f: typeof fetch = fetch) {
  const companyId = requireCompanyAdmin(actor);
  const at = new Date(String(input.startsAt ?? ""));
  if (Number.isNaN(at.getTime())) throw new AppError("VALIDATION", "Elige el horario.");
  let conv: Conv | null = null;
  let customerId = typeof input.customerId === "string" ? input.customerId : "";
  if (typeof input.conversationId === "string" && input.conversationId) {
    if (!z.uuid().safeParse(input.conversationId).success) throw notFound("La conversación");
    conv = await db.conversation.findFirst({ where: { id: input.conversationId, companyId } });
    if (!conv) throw notFound("La conversación");
    customerId = conv.customerId;
  }
  if (!z.uuid().safeParse(customerId).success || !(await db.customer.findFirst({ where: { id: customerId, companyId }, select: { id: true } }))) throw notFound("El cliente");
  const { appointment, site } = await createAppointment(companyId, { customerId, startsAt: at, conversationId: conv?.id ?? null, source: "MANUAL", notes: typeof input.notes === "string" ? input.notes : null, userId: actor.userId });
  if (conv && input.notify !== false && conv.lastInboundAt && now.getTime() - conv.lastInboundAt.getTime() < 24 * 3_600_000) {
    await sendToConversation(conv, `✅ Te agendamos la cita para el ${whenLabel(at)}${site ? ` en ${site.name}` : ""}. ¡Te esperamos!`, { origin: "NEXORA", userId: actor.userId }, f, now).catch(() => null);
  }
  return appointment;
}

export async function listAppointments(actor: Actor, raw: { desde?: string; hasta?: string } = {}, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const today = localDay(now);
  const from = iso.safeParse(raw.desde).success ? raw.desde! : today;
  const to = iso.safeParse(raw.hasta).success ? raw.hasta! : addDays(today, 14);
  const rows = await db.appointment.findMany({
    where: { companyId, startsAt: { gte: new Date(`${from}T00:00:00${OFFSET}`), lte: new Date(`${to}T23:59:59.999${OFFSET}`) } },
    orderBy: { startsAt: "asc" },
    take: 500,
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });
  const sites = new Map((await db.site.findMany({ where: { companyId }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));
  const byDay = new Map<string, typeof rows>();
  for (const r of rows) byDay.set(localDay(r.startsAt), [...(byDay.get(localDay(r.startsAt)) ?? []), r]);
  return {
    from, to,
    days: [...byDay.entries()].map(([day, list]) => ({
      day, label: dayLabel(day),
      items: list.map((a) => ({ id: a.id, time: timeLabel(a.startsAt), startsAt: a.startsAt, status: a.status, source: a.source, notes: a.notes, site: a.siteId ? sites.get(a.siteId) ?? null : null, customer: a.customer, conversationId: a.conversationId })),
    })),
    total: rows.length,
  };
}

const statusSchema = z.enum(["BOOKED", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED"]);

export async function setAppointmentStatus(actor: Actor, id: string, raw: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const status = statusSchema.safeParse(raw);
  if (!status.success) throw new AppError("VALIDATION", "Estado inválido.");
  if (!z.uuid().safeParse(id).success) throw notFound("La cita");
  const a = await db.appointment.findFirst({ where: { id, companyId } });
  if (!a) throw notFound("La cita");
  await db.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: { status: status.data } });
    await audit({ companyId, actorUserId: actor.userId, action: "appointment.status", entityType: "appointment", entityId: id, before: { status: a.status }, after: { status: status.data } }, tx);
  });
}

/** Próximos horarios libres para el selector de «Agendar» (máx. 40). */
export async function slotOptions(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const { site, days } = await availableSlots(companyId, now, 14);
  return { site: site ? { id: site.id, name: site.name } : null, options: days.flatMap((d) => d.slots.map((at) => ({ value: at.toISOString(), label: whenLabel(at) }))).slice(0, 40) };
}

/** Configuración de la agenda (pestaña IA de mensajes). */
export async function saveBookingConfig(actor: Actor, raw: { enabled: unknown; siteId: unknown; slotMinutes: unknown; capacity: unknown }) {
  const companyId = requireCompanyAdmin(actor);
  const v = z.object({
    enabled: z.boolean(),
    siteId: z.uuid().nullable(),
    slotMinutes: z.coerce.number().int().min(10, { error: "Mínimo 10 minutos." }).max(480),
    capacity: z.coerce.number().int().min(1, { error: "Mínimo 1." }).max(50),
  }).safeParse({ enabled: raw.enabled === true || raw.enabled === "on", siteId: typeof raw.siteId === "string" && raw.siteId ? raw.siteId : null, slotMinutes: raw.slotMinutes, capacity: raw.capacity });
  if (!v.success) throw new AppError("VALIDATION", v.error.issues[0]!.message);
  if (v.data.siteId && !(await db.site.findFirst({ where: { id: v.data.siteId, companyId }, select: { id: true } }))) throw notFound("La sede");
  const data = { bookingEnabled: v.data.enabled, bookingSiteId: v.data.siteId, slotMinutes: v.data.slotMinutes, slotCapacity: v.data.capacity };
  await db.crmAiConfig.upsert({ where: { companyId }, create: { companyId, ...data }, update: data });
  await audit({ companyId, actorUserId: actor.userId, action: "booking.config", entityType: "company", entityId: companyId, after: data });
}

/** Próxima cita activa del cliente (para el chat). */
export async function nextAppointment(actor: Actor, customerId: string, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const a = await db.appointment.findFirst({ where: { companyId, customerId, status: { in: ACTIVE }, startsAt: { gte: now } }, orderBy: { startsAt: "asc" } });
  return a ? whenLabel(a.startsAt) : null;
}
