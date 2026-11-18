import "server-only";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { computeLine, saleNumber } from "@/lib/sale-math";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { assertOpen, companyToday, lockDay, METHODS, type Method } from "@/server/cash";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/**
 * Ventas (marca blanca: cada empresa las suyas).
 * - Número consecutivo por empresa, sin huecos ni repetidos (bloqueo por empresa).
 * - Precios del inventario ANTES de IVA; por renglón: subtotal = cantidad ×
 *   precio − descuento; IVA = subtotal × tarifa; redondeo al peso.
 * - En la misma transacción: descuenta el stock de la sede (sin dejarlo
 *   negativo) y registra el ingreso en la caja del día (que debe estar abierta).
 * - No se borra: anular devuelve el stock y anula el ingreso de caja.
 * - Guarda copia del cliente y de cada producto: si cambian después, la venta no.
 */

export { computeLine, saleNumber };
export const CONSUMIDOR_FINAL = { name: "Consumidor final", doc: "222222222222" };
export const DOC_TYPES = ["NIT", "CC", "CE", "PASAPORTE", "PPT", "OTRO"] as const;
const WHOLE_UNITS = new Set(["UNIDAD", "CAJA", "PAQUETE", "SERVICIO"]);
const DAY_MS = 86_400_000;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const isoOf = (d: Date) => d.toISOString().slice(0, 10);


const customerSchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe el nombre del cliente." }).max(120),
  documentType: z.enum(DOC_TYPES).optional().or(z.literal("")).transform((v) => v || null),
  documentNumber: z.string().trim().max(20).regex(/^[A-Za-z0-9-]*$/, { error: "Solo letras, números y guion." }).optional().transform((v) => v || null),
  email: z.email({ error: "Correo inválido." }).trim().toLowerCase().max(120).optional().or(z.literal("")).transform((v) => v || null),
  phone: z.string().trim().regex(/^[0-9+ ]{7,15}$/, { error: "Teléfono inválido." }).optional().or(z.literal("")).transform((v) => v || null),
});

export const saleSchema = z.object({
  siteId: z.uuid({ error: "Elige la sede." }),
  paymentMethod: z.enum(METHODS, { error: "Elige el medio de pago." }),
  customerMode: z.enum(["final", "existing", "new"]).default("final"),
  customerId: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
  customer: customerSchema.optional(),
  notes: z.string().trim().max(300).optional().transform((v) => v || null),
  items: z
    .array(
      z.object({
        productId: z.uuid({ error: "Producto inválido." }),
        quantity: z.coerce.number({ error: "Cantidad inválida." }).positive({ error: "La cantidad debe ser mayor que cero." }).max(1_000_000),
        discount: z.coerce.number({ error: "Descuento inválido." }).min(0, { error: "El descuento no puede ser negativo." }).max(1_000_000_000).default(0),
      }),
      { error: "Agrega al menos un producto." },
    )
    .min(1, { error: "Agrega al menos un producto." })
    .max(100, { error: "Máximo 100 renglones por venta." }),
});

/** Datos para el formulario de nueva venta: sedes, productos activos con stock por sede, clientes. */
export async function saleFormData(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const [sites, products, stock, customers] = await Promise.all([
    db.site.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, sku: true, name: true, kind: true, unit: true, price: true, taxRate: true } }),
    db.stockMovement.groupBy({ by: ["productId", "siteId"], where: { companyId }, _sum: { quantity: true } }),
    db.customer.findMany({ where: { companyId }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, documentType: true, documentNumber: true } }),
  ]);
  const stockBy: Record<string, Record<string, number>> = {};
  for (const r of stock) (stockBy[r.productId] ??= {})[r.siteId] = Math.round(Number(r._sum.quantity ?? 0) * 1000) / 1000;
  return {
    sites,
    products: products.map((p) => ({ ...p, price: Number(p.price), taxRate: Number(p.taxRate), stock: p.kind === "PRODUCT" ? (stockBy[p.id] ?? {}) : null })),
    customers,
  };
}

type Tx = Prisma.TransactionClient;

async function resolveCustomer(tx: Tx, companyId: string, v: z.infer<typeof saleSchema>) {
  if (v.customerMode === "final") return { id: null, name: CONSUMIDOR_FINAL.name, doc: CONSUMIDOR_FINAL.doc };
  if (v.customerMode === "existing") {
    const c = v.customerId ? await tx.customer.findFirst({ where: { id: v.customerId, companyId } }) : null;
    if (!c) throw new AppError("VALIDATION", "Revisa los campos marcados.", { customerId: "Elige un cliente de tu empresa." });
    return { id: c.id, name: c.name, doc: c.documentNumber ? `${c.documentType ?? ""} ${c.documentNumber}`.trim() : null };
  }
  // v.customer ya viene validado por saleSchema; si falta, se valida vacío para mostrar qué pedir.
  let c = v.customer;
  if (!c) {
    const r = customerSchema.safeParse({});
    if (!r.success) throw new AppError("VALIDATION", "Revisa los datos del cliente.", Object.fromEntries(Object.entries(fieldErrors(r.error)).map(([k, m]) => [`customer.${k}`, m])));
    c = r.data;
  }
  if (c.documentNumber && !c.documentType) throw new AppError("VALIDATION", "Revisa los datos del cliente.", { "customer.documentType": "Elige el tipo de documento." });
  // Mismo documento = mismo cliente (se actualizan sus datos de contacto).
  const existing = c.documentNumber ? await tx.customer.findFirst({ where: { companyId, documentType: c.documentType, documentNumber: c.documentNumber } }) : null;
  const saved = existing
    ? await tx.customer.update({ where: { id: existing.id }, data: { name: c.name, email: c.email ?? existing.email, phone: c.phone ?? existing.phone } })
    : await tx.customer.create({ data: { companyId, ...c } });
  return { id: saved.id, name: saved.name, doc: saved.documentNumber ? `${saved.documentType ?? ""} ${saved.documentNumber}`.trim() : null };
}

/** Registra la venta: número, renglones, stock, caja y auditoría en una sola transacción. */
export async function createSale(actor: Actor, input: unknown, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const r = saleSchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(r.error));
  const v = r.data;
  const site = await db.site.findFirst({ where: { id: v.siteId, companyId, active: true }, select: { id: true, name: true } });
  if (!site) throw new AppError("VALIDATION", "Revisa los campos marcados.", { siteId: "Elige una sede activa de tu empresa." });
  const ids = [...new Set(v.items.map((i) => i.productId))];
  if (ids.length !== v.items.length) throw new AppError("VALIDATION", "Un producto está repetido: suma las cantidades en un solo renglón.", { items: "Producto repetido." });
  const products = await db.product.findMany({ where: { companyId, id: { in: ids }, active: true } });
  if (products.length !== ids.length) throw new AppError("VALIDATION", "Un producto no existe o está inactivo.", { items: "Revisa los productos." });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = v.items.map((i, n) => {
    const p = byId.get(i.productId)!;
    if (WHOLE_UNITS.has(p.unit) && !Number.isInteger(i.quantity)) throw new AppError("VALIDATION", `«${p.name}» se vende por unidades enteras.`, { [`items.${n}.quantity`]: "Usa un número entero." });
    const c = computeLine(i.quantity, Number(p.price), i.discount, Number(p.taxRate));
    if (i.discount > c.gross) throw new AppError("VALIDATION", `El descuento de «${p.name}» supera el valor del renglón.`, { [`items.${n}.discount`]: "Supera el valor del renglón." });
    return { p, quantity: i.quantity, discount: i.discount, ...c };
  });
  const totals = {
    subtotal: lines.reduce((a, l) => a + l.subtotal, 0),
    discountTotal: lines.reduce((a, l) => a + l.discount, 0),
    taxTotal: lines.reduce((a, l) => a + l.tax, 0),
  };
  const total = totals.subtotal + totals.taxTotal;
  const today = await companyToday(companyId, now);

  return db.$transaction(async (tx) => {
    // Orden fijo de bloqueos (empresa → caja del día → productos) para no cruzarse.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sale:${companyId}`}))`;
    await lockDay(tx, site.id, today);
    await assertOpen(tx, companyId, site.id, today, "El día de hoy");
    for (const id of [...ids].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stock:${id}`}))`;

    for (const l of lines) {
      if (l.p.kind !== "PRODUCT") continue;
      const agg = await tx.stockMovement.aggregate({ where: { companyId, productId: l.p.id, siteId: site.id }, _sum: { quantity: true } });
      const available = Math.round(Number(agg._sum.quantity ?? 0) * 1000) / 1000;
      if (available < l.quantity) throw new AppError("CONFLICT", `No hay suficiente «${l.p.name}» en ${site.name}: hay ${available}.`);
    }
    const customer = await resolveCustomer(tx, companyId, v);
    const last = await tx.sale.aggregate({ where: { companyId }, _max: { number: true } });
    const number = (last._max.number ?? 0) + 1;
    const sale = await tx.sale.create({
      data: {
        companyId, siteId: site.id, number, date: day(today), customerId: customer.id, customerName: customer.name, customerDoc: customer.doc,
        ...totals, total, paymentMethod: v.paymentMethod, notes: v.notes, createdById: actor.userId,
        items: {
          create: lines.map((l) => ({
            companyId, productId: l.p.id, sku: l.p.sku, name: l.p.name, quantity: l.quantity, unitPrice: l.p.price, discount: l.discount,
            taxRate: l.p.taxRate, subtotal: l.subtotal, tax: l.tax, total: l.total,
          })),
        },
      },
    });
    const label = saleNumber(number);
    for (const l of lines) {
      if (l.p.kind !== "PRODUCT") continue;
      await tx.stockMovement.create({ data: { companyId, productId: l.p.id, siteId: site.id, type: "SALE", quantity: -l.quantity, reason: `Venta ${label}`, reference: label, createdById: actor.userId } });
    }
    if (total > 0) {
      await tx.cashMovement.create({
        data: { companyId, siteId: site.id, date: day(today), type: "IN", category: "Ventas", method: v.paymentMethod, amount: total, description: `${label} · ${customer.name}`, source: "SALE", sourceId: sale.id, createdById: actor.userId },
      });
    }
    await audit({ companyId, actorUserId: actor.userId, action: "sale.create", entityType: "sale", entityId: sale.id, after: { number: label, site: site.name, total, items: lines.length, method: v.paymentMethod } }, tx);
    return { id: sale.id, number, label, total };
  });
}

/**
 * Anula la venta (con motivo): devuelve el stock y anula su ingreso de caja.
 * La caja del día de la venta debe estar abierta.
 */
export async function voidSale(actor: Actor, id: string, reason: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 5) throw new AppError("VALIDATION", "Escribe el motivo de la anulación (mínimo 5 caracteres).", { reason: "Escribe el motivo." });
  if (!z.uuid().safeParse(id).success) throw notFound("La venta");
  const sale = await db.sale.findFirst({ where: { id, companyId }, include: { items: { include: { product: { select: { kind: true } } } } } });
  if (!sale) throw notFound("La venta");
  if (sale.status === "VOIDED") throw new AppError("CONFLICT", "Esta venta ya estaba anulada.");
  const date = isoOf(sale.date);
  const label = saleNumber(sale.number);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sale:${companyId}`}))`;
    await lockDay(tx, sale.siteId, date);
    await assertOpen(tx, companyId, sale.siteId, date, `El día de la venta (${date})`);
    const u = await tx.sale.updateMany({ where: { id, status: "COMPLETED" }, data: { status: "VOIDED", voidedAt: new Date(), voidedById: actor.userId, voidReason: why.slice(0, 300) } });
    if (u.count !== 1) throw new AppError("CONFLICT", "Esta venta ya estaba anulada.");
    for (const it of sale.items) {
      if (it.product.kind !== "PRODUCT") continue;
      await tx.stockMovement.create({ data: { companyId, productId: it.productId, siteId: sale.siteId, type: "SALE", quantity: it.quantity, reason: `Anulación de la venta ${label}`, reference: label, createdById: actor.userId } });
    }
    await tx.cashMovement.updateMany({ where: { companyId, source: "SALE", sourceId: id, voidedAt: null }, data: { voidedAt: new Date(), voidedById: actor.userId, voidReason: `Venta ${label} anulada: ${why}`.slice(0, 300) } });
    await audit({ companyId, actorUserId: actor.userId, action: "sale.void", entityType: "sale", entityId: id, after: { number: label, total: Number(sale.total), reason: why } }, tx);
  });
}

const listSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  sede: z.uuid().optional().catch(undefined),
});

/** Ventas de un rango (por defecto los últimos 30 días) con totales. */
export async function listSales(actor: Actor, raw: Record<string, unknown> = {}, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const f = listSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v ? v : undefined])));
  const today = await companyToday(companyId, now);
  const to = f.hasta && f.hasta <= today ? f.hasta : today;
  const from = f.desde && f.desde <= to ? f.desde : isoOf(new Date(day(to).getTime() - 29 * DAY_MS));
  const num = f.q && /^(v-?)?\d+$/i.test(f.q) ? Number(f.q.replace(/\D/g, "")) : null;
  const where: Prisma.SaleWhereInput = {
    companyId,
    date: { gte: day(from), lte: day(to) },
    ...(f.sede ? { siteId: f.sede } : {}),
    ...(f.q ? { OR: [...(num ? [{ number: num }] : []), { customerName: { contains: f.q, mode: "insensitive" as const } }, { customerDoc: { contains: f.q } }] } : {}),
  };
  const [sales, sites, agg, todayAgg] = await Promise.all([
    db.sale.findMany({ where, orderBy: { number: "desc" }, take: 300, include: { site: { select: { name: true } } } }),
    db.site.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.sale.aggregate({ where: { ...where, status: "COMPLETED" }, _sum: { total: true, taxTotal: true }, _count: { _all: true } }),
    db.sale.aggregate({ where: { companyId, date: day(today), status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
  ]);
  return {
    filters: { ...f, desde: from, hasta: to },
    sites,
    sales: sales.map((s) => ({ id: s.id, number: s.number, label: saleNumber(s.number), date: isoOf(s.date), site: s.site.name, customer: s.customerName, total: Number(s.total), method: s.paymentMethod as Method, status: s.status })),
    summary: { count: agg._count._all, total: Number(agg._sum.total ?? 0), tax: Number(agg._sum.taxTotal ?? 0), todayCount: todayAgg._count._all, todayTotal: Number(todayAgg._sum.total ?? 0) },
  };
}

/** Detalle de una venta (para la pantalla y el comprobante en PDF). */
export async function getSale(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La venta");
  const s = await db.sale.findFirst({
    where: { id, companyId },
    include: {
      items: { orderBy: { id: "asc" } },
      site: { select: { name: true, address: true, city: true } },
      company: { select: { name: true, legalName: true, nit: true, timezone: true } },
      customer: { select: { email: true, phone: true } },
      createdBy: { select: { name: true } },
      voidedBy: { select: { name: true } },
    },
  });
  if (!s) throw notFound("La venta");
  return {
    id: s.id, number: s.number, label: saleNumber(s.number), date: isoOf(s.date), createdAt: s.createdAt, status: s.status,
    company: { name: s.company.legalName ?? s.company.name, nit: s.company.nit, timeZone: s.company.timezone },
    site: s.site, by: s.createdBy.name,
    customer: { name: s.customerName, doc: s.customerDoc, email: s.customer?.email ?? null, phone: s.customer?.phone ?? null },
    items: s.items.map((i) => ({ sku: i.sku, name: i.name, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discount: Number(i.discount), taxRate: Number(i.taxRate), subtotal: Number(i.subtotal), tax: Number(i.tax), total: Number(i.total) })),
    subtotal: Number(s.subtotal), discountTotal: Number(s.discountTotal), taxTotal: Number(s.taxTotal), total: Number(s.total),
    paymentMethod: s.paymentMethod as Method, notes: s.notes,
    voided: s.voidedAt ? { at: s.voidedAt, by: s.voidedBy?.name ?? "—", reason: s.voidReason ?? "" } : null,
  };
}
export type SaleDetail = Awaited<ReturnType<typeof getSale>>;
