import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { localDate } from "@/lib/schedule";
import { fieldErrors } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/**
 * Caja por sede y día (marca blanca: cada empresa la suya).
 * - Ingresos y egresos con su medio de pago. No se borran: se anulan con
 *   motivo (la base lo garantiza con un trigger).
 * - Cierre del día: efectivo esperado (saldo inicial + ingresos − egresos en
 *   efectivo) contra el contado. Con el día cerrado no se registra ni se anula
 *   nada; reabrirlo exige motivo.
 * - El saldo inicial es el efectivo contado en el último cierre anterior.
 */

export const METHODS = ["CASH", "TRANSFER", "CARD", "OTHER"] as const;
export type Method = (typeof METHODS)[number];
export const METHOD_LABEL: Record<Method, string> = { CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", OTHER: "Otro" };
export const SUGGESTED_CATEGORIES = {
  IN: ["Ventas", "Abono de cliente", "Base de caja", "Otros ingresos"],
  OUT: ["Compras", "Proveedores", "Servicios públicos", "Transporte", "Nómina", "Arriendo", "Retiro a banco", "Gastos varios"],
} as const;
const MAX_DAYS_BACK = 60;
const DAY_MS = 86_400_000;

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(day(s).getTime() + n * DAY_MS));
const money = (n: number) => Math.round(n * 100) / 100;
const cop = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." });

type Tx = Prisma.TransactionClient;

async function companyToday(companyId: string, now: Date) {
  const c = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  return localDate(now, c.timezone);
}

async function ownSite(companyId: string, siteId: string, tx: Tx | typeof db = db) {
  if (!z.uuid().safeParse(siteId).success) throw new AppError("VALIDATION", "Revisa los campos marcados.", { siteId: "Elige una sede." });
  const s = await tx.site.findFirst({ where: { id: siteId, companyId }, select: { id: true, name: true, active: true } });
  if (!s) throw new AppError("VALIDATION", "Revisa los campos marcados.", { siteId: "Elige una sede de tu empresa." });
  return s;
}

function checkDate(date: string, today: string) {
  if (date > today) throw new AppError("VALIDATION", "Revisa los campos marcados.", { date: "No se puede registrar en una fecha futura." });
  if (date < addDays(today, -MAX_DAYS_BACK)) throw new AppError("VALIDATION", "Revisa los campos marcados.", { date: `Solo se puede registrar en los últimos ${MAX_DAYS_BACK} días.` });
}

/** Una operación a la vez por sede y día: registrar, anular y cerrar no se cruzan. */
async function lockDay(tx: Tx, siteId: string, date: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cash:${siteId}:${date}`}))`;
}

async function activeClosing(tx: Tx | typeof db, companyId: string, siteId: string, date: string) {
  return tx.cashClosing.findFirst({ where: { companyId, siteId, date: day(date), reopenedAt: null } });
}

async function assertOpen(tx: Tx, companyId: string, siteId: string, date: string) {
  if (await activeClosing(tx, companyId, siteId, date)) throw new AppError("CONFLICT", "Ese día ya está cerrado. Para cambiarlo, reábrelo con un motivo.");
}

/** Saldo inicial: lo contado en el último cierre vigente anterior a la fecha. */
async function openingBalance(tx: Tx | typeof db, companyId: string, siteId: string, date: string) {
  const prev = await tx.cashClosing.findFirst({
    where: { companyId, siteId, date: { lt: day(date) }, reopenedAt: null },
    orderBy: { date: "desc" },
    select: { counted: true, date: true },
  });
  return { amount: prev ? Number(prev.counted) : 0, from: prev ? iso(prev.date) : null };
}

/** Totales del día (sin anulados) por tipo y medio, y efectivo esperado. */
async function dayTotals(tx: Tx | typeof db, companyId: string, siteId: string, date: string) {
  const groups = await tx.cashMovement.groupBy({
    by: ["type", "method"],
    where: { companyId, siteId, date: day(date), voidedAt: null },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const byMethod = Object.fromEntries(METHODS.map((m) => [m, { in: 0, out: 0 }])) as Record<Method, { in: number; out: number }>;
  for (const g of groups) byMethod[g.method as Method][g.type === "IN" ? "in" : "out"] = money(Number(g._sum.amount ?? 0));
  const totalIn = money(METHODS.reduce((a, m) => a + byMethod[m].in, 0));
  const totalOut = money(METHODS.reduce((a, m) => a + byMethod[m].out, 0));
  return { byMethod, totalIn, totalOut, cashIn: byMethod.CASH.in, cashOut: byMethod.CASH.out, count: groups.reduce((a, g) => a + g._count._all, 0) };
}

const daySchema = z.object({ sede: z.uuid().optional().catch(undefined), fecha: isoDate.optional().catch(undefined) });

/** Vista del día: movimientos, totales, saldo inicial, cierre y últimos cierres de la sede. */
export async function cashDay(actor: Actor, raw: Record<string, unknown> = {}, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const f = daySchema.parse({ sede: typeof raw.sede === "string" && raw.sede ? raw.sede : undefined, fecha: typeof raw.fecha === "string" && raw.fecha ? raw.fecha : undefined });
  const today = await companyToday(companyId, now);
  const sites = await db.site.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const site = sites.find((s) => s.id === f.sede) ?? sites[0];
  const date = f.fecha && f.fecha <= today && f.fecha >= addDays(today, -365) ? f.fecha : today;
  if (!site) return { today, date, sites, site: null };

  const [movements, totals, opening, closing, recent] = await Promise.all([
    db.cashMovement.findMany({
      where: { companyId, siteId: site.id, date: day(date) },
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { name: true } }, voidedBy: { select: { name: true } } },
    }),
    dayTotals(db, companyId, site.id, date),
    openingBalance(db, companyId, site.id, date),
    db.cashClosing.findFirst({ where: { companyId, siteId: site.id, date: day(date), reopenedAt: null }, include: { closedBy: { select: { name: true } } } }),
    db.cashClosing.findMany({
      where: { companyId, siteId: site.id },
      orderBy: [{ date: "desc" }, { closedAt: "desc" }],
      take: 12,
      include: { closedBy: { select: { name: true } }, reopenedBy: { select: { name: true } } },
    }),
  ]);
  const expected = money(opening.amount + totals.cashIn - totals.cashOut);
  return {
    today, date, sites, site,
    editable: !closing && date >= addDays(today, -MAX_DAYS_BACK),
    opening, totals, expected,
    movements: movements.map((m) => ({
      id: m.id, type: m.type, category: m.category, method: m.method as Method, amount: Number(m.amount), description: m.description, source: m.source,
      by: m.createdBy.name, at: m.createdAt, voided: m.voidedAt ? { at: m.voidedAt, by: m.voidedBy?.name ?? "—", reason: m.voidReason ?? "" } : null,
    })),
    closing: closing ? { id: closing.id, counted: Number(closing.counted), expected: Number(closing.expected), difference: Number(closing.difference), notes: closing.notes, by: closing.closedBy.name, at: closing.closedAt } : null,
    recent: recent.map((c) => ({
      id: c.id, date: iso(c.date), expected: Number(c.expected), counted: Number(c.counted), difference: Number(c.difference), by: c.closedBy.name, at: c.closedAt,
      reopened: c.reopenedAt ? { at: c.reopenedAt, by: c.reopenedBy?.name ?? "—", reason: c.reopenReason ?? "" } : null,
    })),
  };
}

export const movementSchema = z.object({
  siteId: z.string(),
  date: isoDate,
  type: z.enum(["IN", "OUT"], { error: "Elige si es ingreso o egreso." }),
  category: z.string().trim().min(2, { error: "Escribe la categoría (p. ej. Ventas, Compras)." }).max(60),
  method: z.enum(METHODS, { error: "Elige el medio de pago." }),
  amount: z.coerce.number({ error: "Valor inválido." }).positive({ error: "Debe ser mayor que cero." }).max(1_000_000_000, { error: "Valor demasiado alto." })
    .refine((n) => Math.round(n * 100) === n * 100, { error: "Máximo 2 decimales." }),
  description: z.string().trim().max(300).optional().transform((v) => v || null),
});

/** Registra un ingreso o egreso en la caja de una sede (el día debe estar abierto). */
export async function addCashMovement(actor: Actor, input: unknown, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const r = movementSchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(r.error));
  const v = r.data;
  const site = await ownSite(companyId, v.siteId);
  if (!site.active) throw new AppError("VALIDATION", "Revisa los campos marcados.", { siteId: "La sede está inactiva." });
  checkDate(v.date, await companyToday(companyId, now));
  return db.$transaction(async (tx) => {
    await lockDay(tx, site.id, v.date);
    await assertOpen(tx, companyId, site.id, v.date);
    const m = await tx.cashMovement.create({
      data: { companyId, siteId: site.id, date: day(v.date), type: v.type, category: v.category, method: v.method, amount: v.amount, description: v.description, createdById: actor.userId },
    });
    await audit({ companyId, actorUserId: actor.userId, action: v.type === "IN" ? "cash.in" : "cash.out", entityType: "cash_movement", entityId: m.id, after: { site: site.name, date: v.date, category: v.category, method: v.method, amount: v.amount } }, tx);
    return m;
  });
}

/** Anula un movimiento (con motivo). El movimiento sigue visible, tachado. */
export async function voidCashMovement(actor: Actor, id: string, reason: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 5) throw new AppError("VALIDATION", "Escribe el motivo de la anulación (mínimo 5 caracteres).", { reason: "Escribe el motivo." });
  if (!z.uuid().safeParse(id).success) throw notFound("El movimiento");
  const m = await db.cashMovement.findFirst({ where: { id, companyId } });
  if (!m) throw notFound("El movimiento");
  if (m.source) throw new AppError("CONFLICT", "Este movimiento viene de una venta: anula la venta para reversarlo.");
  const date = iso(m.date);
  await db.$transaction(async (tx) => {
    await lockDay(tx, m.siteId, date);
    await assertOpen(tx, companyId, m.siteId, date);
    const u = await tx.cashMovement.updateMany({ where: { id, voidedAt: null }, data: { voidedAt: new Date(), voidedById: actor.userId, voidReason: why.slice(0, 300) } });
    if (u.count !== 1) throw new AppError("CONFLICT", "Este movimiento ya estaba anulado.");
    await audit({ companyId, actorUserId: actor.userId, action: "cash.void", entityType: "cash_movement", entityId: id, after: { amount: Number(m.amount), reason: why } }, tx);
  });
}

export const closeSchema = z.object({
  siteId: z.string(),
  date: isoDate,
  counted: z.coerce.number({ error: "Escribe el efectivo contado." }).min(0, { error: "No puede ser negativo." }).max(1_000_000_000),
  notes: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/**
 * Cierra el día: guarda lo esperado y lo contado. Si no cuadra, exige
 * observación. Después de cerrar, el día no admite cambios.
 */
export async function closeCashDay(actor: Actor, input: unknown, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const r = closeSchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(r.error));
  const v = r.data;
  const site = await ownSite(companyId, v.siteId);
  const today = await companyToday(companyId, now);
  if (v.date > today) throw new AppError("VALIDATION", "Revisa los campos marcados.", { date: "No se puede cerrar un día futuro." });
  return db.$transaction(async (tx) => {
    await lockDay(tx, site.id, v.date);
    await assertOpen(tx, companyId, site.id, v.date);
    const [totals, opening] = await Promise.all([dayTotals(tx, companyId, site.id, v.date), openingBalance(tx, companyId, site.id, v.date)]);
    const expected = money(opening.amount + totals.cashIn - totals.cashOut);
    const difference = money(v.counted - expected);
    if (difference !== 0 && !v.notes) {
      throw new AppError("VALIDATION", "Revisa los campos marcados.", { notes: `La caja no cuadra (${difference > 0 ? "sobran" : "faltan"} ${cop(Math.abs(difference))}): explica la diferencia.` });
    }
    const c = await tx.cashClosing.create({
      data: {
        companyId, siteId: site.id, date: day(v.date), openingBalance: opening.amount, cashIn: totals.cashIn, cashOut: totals.cashOut, expected, counted: v.counted, difference,
        totals: { byMethod: totals.byMethod, totalIn: totals.totalIn, totalOut: totals.totalOut, movements: totals.count, openingFrom: opening.from },
        notes: v.notes, closedById: actor.userId,
      },
    });
    await audit({ companyId, actorUserId: actor.userId, action: "cash.close", entityType: "cash_closing", entityId: c.id, after: { site: site.name, date: v.date, expected, counted: v.counted, difference } }, tx);
    return { id: c.id, expected, counted: v.counted, difference };
  });
}

/** Reabre un día cerrado (con motivo) para corregirlo; el cierre anterior queda en el historial. */
export async function reopenCashDay(actor: Actor, closingId: string, reason: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 5) throw new AppError("VALIDATION", "Escribe el motivo para reabrir (mínimo 5 caracteres).", { reason: "Escribe el motivo." });
  if (!z.uuid().safeParse(closingId).success) throw notFound("El cierre");
  const c = await db.cashClosing.findFirst({ where: { id: closingId, companyId } });
  if (!c) throw notFound("El cierre");
  const date = iso(c.date);
  await db.$transaction(async (tx) => {
    await lockDay(tx, c.siteId, date);
    // Reabrir un día cambia el saldo inicial de los siguientes: solo el último día cerrado de la sede.
    const later = await tx.cashClosing.count({ where: { companyId, siteId: c.siteId, date: { gt: c.date }, reopenedAt: null } });
    if (later > 0) throw new AppError("CONFLICT", "Hay días posteriores cerrados en esta sede. Reabre primero el más reciente.");
    const u = await tx.cashClosing.updateMany({ where: { id: c.id, reopenedAt: null }, data: { reopenedAt: new Date(), reopenedById: actor.userId, reopenReason: why.slice(0, 500) } });
    if (u.count !== 1) throw new AppError("CONFLICT", "Este cierre ya estaba reabierto.");
    await audit({ companyId, actorUserId: actor.userId, action: "cash.reopen", entityType: "cash_closing", entityId: c.id, after: { date, reason: why } }, tx);
  });
}
