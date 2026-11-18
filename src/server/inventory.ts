import "server-only";
import { randomUUID } from "node:crypto";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/**
 * Inventario (marca blanca: cada empresa el suyo).
 * - Productos y servicios; los servicios no llevan stock.
 * - El stock de cada sede es la suma de sus movimientos, que son de solo
 *   inserción (trigger en la base): una corrección es un movimiento nuevo.
 * - Un movimiento a la vez por producto (bloqueo en la transacción): dos
 *   salidas simultáneas no dejan el stock en negativo.
 */

export const UNITS = ["UNIDAD", "KG", "GRAMO", "LITRO", "ML", "METRO", "CAJA", "PAQUETE", "HORA", "SERVICIO"] as const;
const WHOLE_UNITS = new Set(["UNIDAD", "CAJA", "PAQUETE"]);
export const UNIT_LABEL: Record<(typeof UNITS)[number], string> = {
  UNIDAD: "Unidad", KG: "Kilogramo", GRAMO: "Gramo", LITRO: "Litro", ML: "Mililitro", METRO: "Metro", CAJA: "Caja", PAQUETE: "Paquete", HORA: "Hora", SERVICIO: "Servicio",
};
export const MOVEMENT_LABEL = {
  IN: "Entrada", OUT: "Salida", ADJUST: "Ajuste por conteo", TRANSFER_OUT: "Traslado (sale)", TRANSFER_IN: "Traslado (entra)", SALE: "Venta",
} as const;

const optionalText = (max: number) => z.string().trim().max(max, { error: `Máximo ${max} caracteres.` }).optional().transform((v) => v || null);
const amount = (label: string) => z.coerce.number({ error: `${label} inválido.` }).min(0, { error: "No puede ser negativo." }).max(1_000_000_000, { error: "Valor demasiado alto." });

export const productSchema = z.object({
  sku: z.string().trim().min(1, { error: "Escribe un código (SKU)." }).max(40).regex(/^[A-Za-z0-9._-]+$/, { error: "Solo letras, números, punto, guion y guion bajo." }).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, { error: "Escribe el nombre." }).max(120),
  category: optionalText(60),
  kind: z.enum(["PRODUCT", "SERVICE"], { error: "Elige si es producto o servicio." }),
  unit: z.enum(UNITS, { error: "Elige la unidad." }),
  price: amount("Precio"),
  cost: z.union([z.literal(""), amount("Costo")]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  taxRate: z.coerce.number({ error: "IVA inválido." }).min(0).max(100, { error: "Máximo 100 %." }),
  minStock: z.union([z.literal(""), z.coerce.number({ error: "Stock mínimo inválido." }).min(0, { error: "No puede ser negativo." }).max(1_000_000_000)]).optional().transform((v) => (v === "" || v === undefined ? 0 : v)),
  barcode: optionalText(40),
});

function parseProduct(input: unknown) {
  const r = productSchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(r.error));
  return r.data;
}

const duplicateSku = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createProduct(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const v = parseProduct(input);
  try {
    return await db.$transaction(async (tx) => {
      const p = await tx.product.create({ data: { ...v, minStock: v.kind === "SERVICE" ? 0 : v.minStock, companyId } });
      await audit({ companyId, actorUserId: actor.userId, action: "product.create", entityType: "product", entityId: p.id, after: { sku: p.sku, name: p.name, price: v.price } }, tx);
      return p;
    });
  } catch (e) {
    if (duplicateSku(e)) throw new AppError("CONFLICT", "Ya existe un producto con ese código.", { sku: "Ese código (SKU) ya existe." });
    throw e;
  }
}

async function getOwnProduct(companyId: string, id: string) {
  if (!z.uuid().safeParse(id).success) throw notFound("El producto");
  const p = await db.product.findFirst({ where: { id, companyId } });
  if (!p) throw notFound("El producto");
  return p;
}

export async function updateProduct(actor: Actor, id: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const before = await getOwnProduct(companyId, id);
  const v = parseProduct(input);
  if (before.kind === "PRODUCT" && v.kind === "SERVICE" && (await db.stockMovement.count({ where: { productId: id, companyId } })) > 0) {
    throw new AppError("VALIDATION", "Revisa los campos marcados.", { kind: "Ya tiene movimientos de inventario: no se puede cambiar a servicio." });
  }
  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { ...v, minStock: v.kind === "SERVICE" ? 0 : v.minStock } });
      await audit({
        companyId, actorUserId: actor.userId, action: "product.update", entityType: "product", entityId: id,
        before: { sku: before.sku, name: before.name, price: Number(before.price), cost: before.cost == null ? null : Number(before.cost) },
        after: { sku: v.sku, name: v.name, price: v.price, cost: v.cost },
      }, tx);
    });
  } catch (e) {
    if (duplicateSku(e)) throw new AppError("CONFLICT", "Ya existe un producto con ese código.", { sku: "Ese código (SKU) ya existe." });
    throw e;
  }
}

export async function setProductActive(actor: Actor, id: string, active: boolean) {
  const companyId = requireCompanyAdmin(actor);
  await getOwnProduct(companyId, id);
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { active } });
    await audit({ companyId, actorUserId: actor.userId, action: active ? "product.activate" : "product.deactivate", entityType: "product", entityId: id }, tx);
  });
}

// ───────────────────────────── Stock ─────────────────────────────

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Stock por producto y sede (suma de movimientos). */
async function stockMap(companyId: string, productIds?: string[], siteId?: string | null) {
  const rows = await db.stockMovement.groupBy({
    by: ["productId", "siteId"],
    where: { companyId, ...(productIds ? { productId: { in: productIds } } : {}), ...(siteId ? { siteId } : {}) },
    _sum: { quantity: true },
  });
  const m = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const per = m.get(r.productId) ?? new Map<string, number>();
    per.set(r.siteId, round3(Number(r._sum.quantity ?? 0)));
    m.set(r.productId, per);
  }
  return m;
}

const listSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  categoria: z.string().trim().max(60).optional().catch(undefined),
  sede: z.uuid().optional().catch(undefined),
  bajo: z.literal("1").optional().catch(undefined),
  inactivos: z.literal("1").optional().catch(undefined),
});

/** Productos con su stock (total o de una sede), filtros de la URL y resumen. */
export async function listProducts(actor: Actor, raw: Record<string, unknown> = {}) {
  const companyId = requireCompanyAdmin(actor);
  const f = listSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v ? v : undefined])));
  const [products, sites, categories] = await Promise.all([
    db.product.findMany({
      where: {
        companyId,
        ...(f.inactivos ? {} : { active: true }),
        ...(f.categoria ? { category: f.categoria } : {}),
        ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { sku: { contains: f.q, mode: "insensitive" } }, { barcode: f.q }] } : {}),
      },
      orderBy: { name: "asc" },
    }),
    db.site.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ where: { companyId, category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);
  const stock = await stockMap(companyId, products.map((p) => p.id), f.sede ?? null);
  const rows = products.map((p) => {
    const qty = p.kind === "SERVICE" ? null : round3([...(stock.get(p.id)?.values() ?? [])].reduce((a, b) => a + b, 0));
    const min = Number(p.minStock);
    return {
      id: p.id, sku: p.sku, name: p.name, category: p.category, kind: p.kind, unit: p.unit, active: p.active,
      price: Number(p.price), cost: p.cost == null ? null : Number(p.cost), taxRate: Number(p.taxRate), minStock: min,
      stock: qty, low: qty != null && min > 0 && qty <= min,
      value: qty != null && p.cost != null ? Math.max(0, qty) * Number(p.cost) : null,
    };
  });
  const filtered = f.bajo ? rows.filter((r) => r.low) : rows;
  return {
    filters: f,
    sites,
    categories: categories.map((c) => c.category!).filter(Boolean),
    rows: filtered,
    summary: {
      products: rows.filter((r) => r.active).length,
      low: rows.filter((r) => r.low && r.active).length,
      value: rows.reduce((a, r) => a + (r.value ?? 0), 0),
      withoutCost: rows.filter((r) => r.kind === "PRODUCT" && r.cost == null && (r.stock ?? 0) > 0).length,
    },
  };
}

/** Ficha del producto: datos, stock por sede y últimos movimientos. */
export async function getProduct(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  const p = await getOwnProduct(companyId, id);
  const [sites, stock, movements] = await Promise.all([
    db.site.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true, active: true } }),
    stockMap(companyId, [id]),
    db.stockMovement.findMany({
      where: { companyId, productId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { site: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
  ]);
  const per = stock.get(id) ?? new Map<string, number>();
  return {
    product: { ...p, price: Number(p.price), cost: p.cost == null ? null : Number(p.cost), taxRate: Number(p.taxRate), minStock: Number(p.minStock) },
    bySite: sites.filter((s) => s.active || per.has(s.id)).map((s) => ({ ...s, qty: per.get(s.id) ?? 0 })),
    total: round3([...per.values()].reduce((a, b) => a + b, 0)),
    movements: movements.map((m) => ({
      id: m.id, type: m.type, quantity: Number(m.quantity), unitCost: m.unitCost == null ? null : Number(m.unitCost), reason: m.reason, reference: m.reference,
      siteName: m.site.name, by: m.createdBy?.name ?? "—", at: m.createdAt,
    })),
  };
}

const qty = z.coerce.number({ error: "Cantidad inválida." }).max(1_000_000_000, { error: "Cantidad demasiado alta." });

export const movementSchema = z
  .object({
    productId: z.uuid({ error: "Producto inválido." }),
    type: z.enum(["IN", "OUT", "ADJUST", "TRANSFER"], { error: "Elige el tipo de movimiento." }),
    siteId: z.uuid({ error: "Elige la sede." }),
    toSiteId: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
    quantity: qty,
    unitCost: z.union([z.literal(""), amount("Costo")]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
    reason: z.string().trim().min(3, { error: "Escribe el motivo (p. ej. compra a proveedor, producto dañado)." }).max(200),
    reference: optionalText(60),
  })
  .superRefine((v, ctx) => {
    if (v.type === "ADJUST" ? v.quantity < 0 : v.quantity <= 0) ctx.addIssue({ code: "custom", path: ["quantity"], message: v.type === "ADJUST" ? "El conteo no puede ser negativo." : "Debe ser mayor que cero." });
    if (Math.round(v.quantity * 1000) !== v.quantity * 1000) ctx.addIssue({ code: "custom", path: ["quantity"], message: "Máximo 3 decimales." });
    if (v.type === "TRANSFER" && !v.toSiteId) ctx.addIssue({ code: "custom", path: ["toSiteId"], message: "Elige la sede de destino." });
    if (v.type === "TRANSFER" && v.toSiteId === v.siteId) ctx.addIssue({ code: "custom", path: ["toSiteId"], message: "Debe ser una sede distinta." });
  });

/**
 * Registra un movimiento. Entrada y salida mueven la cantidad indicada; el
 * ajuste recibe el CONTEO físico y registra la diferencia; el traslado crea
 * la salida de una sede y la entrada en la otra.
 */
export async function recordMovement(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const r = movementSchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(r.error));
  const v = r.data;
  const p = await getOwnProduct(companyId, v.productId);
  if (p.kind === "SERVICE") throw new AppError("CONFLICT", "Los servicios no llevan inventario.");
  if (!p.active) throw new AppError("CONFLICT", "El producto está inactivo. Actívalo para moverlo.");
  if (WHOLE_UNITS.has(p.unit) && !Number.isInteger(v.quantity)) throw new AppError("VALIDATION", "Revisa los campos marcados.", { quantity: `Se maneja por ${UNIT_LABEL[p.unit as keyof typeof UNIT_LABEL].toLowerCase()}: usa un número entero.` });
  const siteIds = [v.siteId, ...(v.toSiteId ? [v.toSiteId] : [])];
  const sites = await db.site.findMany({ where: { companyId, id: { in: siteIds }, active: true }, select: { id: true, name: true } });
  if (sites.length !== new Set(siteIds).size) throw new AppError("VALIDATION", "Revisa los campos marcados.", { siteId: "Elige una sede activa de tu empresa." });
  const siteName = (id: string) => sites.find((s) => s.id === id)!.name;

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stock:${p.id}`}))`;
    const agg = await tx.stockMovement.aggregate({ where: { companyId, productId: p.id, siteId: v.siteId }, _sum: { quantity: true } });
    const current = round3(Number(agg._sum.quantity ?? 0));
    const base = { companyId, productId: p.id, reason: v.reason, reference: v.reference, createdById: actor.userId };
    let delta: number;
    if (v.type === "ADJUST") {
      delta = round3(v.quantity - current);
      if (delta === 0) throw new AppError("CONFLICT", `El conteo coincide con el sistema (${current}). No hay nada que ajustar.`);
    } else {
      delta = v.type === "IN" ? v.quantity : -v.quantity;
      if (delta < 0 && current + delta < -0.0005) throw new AppError("CONFLICT", `Solo hay ${current} en ${siteName(v.siteId)}.`, { quantity: `Disponible: ${current}.` });
    }
    const transferId = v.type === "TRANSFER" ? randomUUID() : null;
    const type = v.type === "TRANSFER" ? "TRANSFER_OUT" : v.type;
    const created = await tx.stockMovement.create({ data: { ...base, siteId: v.siteId, type, quantity: delta, unitCost: v.type === "IN" ? v.unitCost : null, transferId } });
    if (v.type === "TRANSFER") {
      await tx.stockMovement.create({ data: { ...base, siteId: v.toSiteId!, type: "TRANSFER_IN", quantity: v.quantity, transferId } });
    }
    // El costo del producto queda en el de la última compra.
    if (v.type === "IN" && v.unitCost != null) await tx.product.update({ where: { id: p.id }, data: { cost: v.unitCost } });
    await audit({
      companyId, actorUserId: actor.userId, action: `stock.${v.type.toLowerCase()}`, entityType: "product", entityId: p.id,
      after: { site: siteName(v.siteId), toSite: v.toSiteId ? siteName(v.toSiteId) : null, quantity: delta, before: current, reason: v.reason },
    }, tx);
    return { id: created.id, delta, before: current, after: round3(current + delta) };
  });
}
