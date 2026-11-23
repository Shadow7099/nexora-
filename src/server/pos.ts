import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { METHODS } from "@/server/cash";
import { AppError, notFound } from "@/server/errors";
import { createSale } from "@/server/sales";
import type { Actor } from "@/server/sessions";

/**
 * Punto de venta (POS) visual: catálogo por cuadros grandes, pensado para que
 * cualquier persona lo use con un toque: Categoría → Subcategoría → Producto →
 * Gramaje o tamaño → Color. Cada variante (p. ej. «Algodón 50 g Rojo») es un
 * producto del inventario de Nexora con su propio stock; al cobrar se usa la
 * venta normal (descuenta stock, entra a la caja del día y queda numerada).
 */

export const POS_ICONS = ["yarn", "crochet", "needles", "embroidery", "accessories", "box"] as const;
export const POS_ICON_LABEL: Record<(typeof POS_ICONS)[number], string> = {
  yarn: "Ovillo", crochet: "Ganchillo", needles: "Agujas", embroidery: "Bordado", accessories: "Accesorios", box: "Caja",
};
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Color inválido." });

/** Catálogo del POS con el stock de la sede elegida. */
export async function posCatalog(actor: Actor, siteId?: string) {
  const companyId = requireCompanyAdmin(actor);
  const sites = await db.site.findMany({ where: { companyId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
  // Por defecto, la sede principal (la primera creada): ahí queda el inventario inicial.
  const site = sites.find((s) => s.id === siteId) ?? sites[0] ?? null;
  const [categories, products] = await Promise.all([
    db.posCategory.findMany({ where: { companyId, active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.product.findMany({
      where: { companyId, active: true, posCategoryId: { not: null } },
      orderBy: [{ posGroup: "asc" }, { name: "asc" }],
      select: { id: true, sku: true, name: true, kind: true, unit: true, price: true, taxRate: true, posCategoryId: true, posGroup: true, variantSize: true, variantColor: true, variantHex: true, imageUrl: true },
    }),
  ]);
  const stock = site && products.length
    ? await db.stockMovement.groupBy({ by: ["productId"], where: { companyId, siteId: site.id, productId: { in: products.map((p) => p.id) } }, _sum: { quantity: true } })
    : [];
  const qty = new Map(stock.map((s) => [s.productId, Math.round(Number(s._sum.quantity ?? 0) * 1000) / 1000]));
  return {
    sites,
    site,
    categories: categories.map((c) => ({ id: c.id, parentId: c.parentId, name: c.name, color: c.color, icon: c.icon, imageUrl: c.imageUrl })),
    products: products.map((p) => ({
      ...p,
      price: Number(p.price),
      taxRate: Number(p.taxRate),
      // Precio final con IVA (lo que paga el cliente).
      finalPrice: Math.round(Number(p.price) * (1 + Number(p.taxRate) / 100)),
      stock: p.kind === "SERVICE" ? null : (qty.get(p.id) ?? 0),
    })),
  };
}
export type PosCatalog = Awaited<ReturnType<typeof posCatalog>>;

// ───────────────────────────── Catálogo ─────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe el nombre." }).max(60),
  parentId: z.uuid().nullable(),
  color: hex,
  icon: z.enum(POS_ICONS),
});

export async function savePosCategory(actor: Actor, raw: { id?: unknown; name: unknown; parentId?: unknown; color: unknown; icon: unknown }) {
  const companyId = requireCompanyAdmin(actor);
  const r = categorySchema.safeParse({ name: raw.name, parentId: typeof raw.parentId === "string" && raw.parentId ? raw.parentId : null, color: raw.color, icon: raw.icon });
  if (!r.success) throw new AppError("VALIDATION", r.error.issues[0]!.message);
  const v = r.data;
  if (v.parentId) {
    const parent = await db.posCategory.findFirst({ where: { id: v.parentId, companyId } });
    if (!parent) throw notFound("La categoría");
    if (parent.parentId) throw new AppError("VALIDATION", "Solo hay dos niveles: categoría y subcategoría.");
  }
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  if (id) {
    const own = await db.posCategory.findFirst({ where: { id, companyId } });
    if (!own) throw notFound("La categoría");
    if (v.parentId === id) throw new AppError("VALIDATION", "Una categoría no puede estar dentro de sí misma.");
    await db.posCategory.update({ where: { id }, data: v });
    return id;
  }
  const c = await db.posCategory.create({ data: { companyId, ...v, sortOrder: await db.posCategory.count({ where: { companyId, parentId: v.parentId } }) } });
  await audit({ companyId, actorUserId: actor.userId, action: "pos.category_create", entityType: "pos_category", entityId: c.id, after: { name: c.name } });
  return c.id;
}

/** Quita una categoría del POS (se oculta; sus productos siguen en el inventario). */
export async function hidePosCategory(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La categoría");
  const r = await db.posCategory.updateMany({ where: { companyId, OR: [{ id }, { parentId: id }] }, data: { active: false } });
  if (!r.count) throw notFound("La categoría");
}

const familySchema = z.object({
  subcategoryId: z.uuid({ error: "Elige la subcategoría." }),
  name: z.string().trim().min(2, { error: "Escribe el nombre del producto." }).max(80),
  sizes: z.array(z.object({ label: z.string().trim().max(20), price: z.coerce.number().min(0).max(1_000_000_000) })).min(1, { error: "Agrega al menos un precio." }).max(12),
  colors: z.array(z.object({ name: z.string().trim().min(1).max(30), hex })).max(40),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  initialStock: z.coerce.number().min(0).max(100_000).default(0),
  siteId: z.uuid().nullable().optional(),
});

const code = (s: string, n = 3) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, n) || "X";

/**
 * Crea un producto con todas sus variantes: una por cada gramaje × color
 * (p. ej. 3 gramajes × 10 colores = 30 productos en el inventario), cada una
 * con su código (SKU), precio según el gramaje y stock inicial opcional.
 */
export async function createPosFamily(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const r = familySchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", r.error.issues[0]!.message);
  const v = r.data;
  const sub = await db.posCategory.findFirst({ where: { id: v.subcategoryId, companyId, active: true }, include: { parent: true } });
  if (!sub || !sub.parentId) throw new AppError("VALIDATION", "Elige una subcategoría (dentro de una categoría).");
  const site = v.initialStock > 0 ? await db.site.findFirst({ where: { companyId, active: true, ...(v.siteId ? { id: v.siteId } : {}) }, orderBy: { createdAt: "asc" } }) : null;
  const colors = v.colors.length ? v.colors : [null];
  const prefix = `${code(sub.parent!.name, 2)}${code(sub.name, 2)}-${code(v.name, 4)}`;
  let created = 0;
  await db.$transaction(async (tx) => {
    for (const size of v.sizes) {
      for (const color of colors) {
        const name = [v.name, size.label || null, color?.name ?? null].filter(Boolean).join(" ");
        // La misma variante ya existe (repetir no duplica).
        if (await tx.product.findFirst({ where: { companyId, posCategoryId: sub.id, posGroup: v.name, variantSize: size.label || null, variantColor: color?.name ?? null }, select: { id: true } })) continue;
        const base = [prefix, size.label ? code(size.label, 6) : null, color ? code(color.name, 10) : null].filter(Boolean).join("-").slice(0, 36);
        // Código único: si otro producto ya lo usa, se le agrega un número.
        let sku = base;
        for (let n = 2; await tx.product.findFirst({ where: { companyId, sku }, select: { id: true } }); n++) sku = `${base}-${n}`;
        const p = await tx.product.create({
          data: {
            companyId, sku, name, category: sub.name, kind: "PRODUCT", unit: "UNIDAD", price: size.price, taxRate: v.taxRate,
            posCategoryId: sub.id, posGroup: v.name, variantSize: size.label || null, variantColor: color?.name ?? null, variantHex: color?.hex ?? null,
          },
        });
        if (site) await tx.stockMovement.create({ data: { companyId, productId: p.id, siteId: site.id, type: "IN", quantity: v.initialStock, reason: "Inventario inicial", createdById: actor.userId } });
        created++;
      }
    }
    await audit({ companyId, actorUserId: actor.userId, action: "pos.family_create", entityType: "pos_category", entityId: sub.id, after: { name: v.name, variants: created } }, tx);
  }, { timeout: 30_000 });
  return { created };
}

// ───────────────────────────── Tienda de hilos de ejemplo ─────────────────────────────

const COLORS = {
  blanco: ["Blanco", "#FFFFFF"], crudo: ["Crudo", "#F3E9D2"], negro: ["Negro", "#1F2937"], rojo: ["Rojo", "#DC2626"],
  rosado: ["Rosado", "#F472B6"], fucsia: ["Fucsia", "#C026D3"], lila: ["Lila", "#A78BFA"], azul: ["Azul rey", "#1D4ED8"],
  celeste: ["Celeste", "#7DD3FC"], verde: ["Verde", "#16A34A"], menta: ["Verde menta", "#6EE7B7"], amarillo: ["Amarillo", "#FACC15"],
  naranja: ["Naranja", "#F97316"], cafe: ["Café", "#92400E"], gris: ["Gris", "#9CA3AF"], beige: ["Beige", "#D6C4A8"],
} as const;
const pick = (...k: (keyof typeof COLORS)[]) => k.map((x) => ({ name: COLORS[x][0], hex: COLORS[x][1] }));
const ALL = Object.keys(COLORS) as (keyof typeof COLORS)[];

const YARN_SHOP: { name: string; color: string; icon: (typeof POS_ICONS)[number]; subs: { name: string; color: string; icon: (typeof POS_ICONS)[number]; families: { name: string; sizes: [string, number][]; colors: { name: string; hex: string }[] }[] }[] }[] = [
  {
    name: "Hilos", color: "#EC4899", icon: "yarn",
    subs: [
      { name: "Hilos de crochet", color: "#DB2777", icon: "crochet", families: [
        { name: "Algodón mercerizado", sizes: [["50 g", 6500], ["100 g", 11900], ["125 g", 14500]], colors: pick(...ALL.slice(0, 12)) },
        { name: "Acrílico suave", sizes: [["100 g", 8900]], colors: pick("blanco", "negro", "rojo", "rosado", "lila", "azul", "verde", "amarillo") },
      ] },
      { name: "Hilos para bordar", color: "#9333EA", icon: "embroidery", families: [
        { name: "Madeja de bordar", sizes: [["8 m", 2500]], colors: pick("blanco", "negro", "rojo", "rosado", "fucsia", "lila", "azul", "celeste", "verde", "menta", "amarillo", "naranja") },
      ] },
      { name: "Hilos de coser", color: "#0EA5E9", icon: "yarn", families: [
        { name: "Poliéster", sizes: [["100 m", 3500], ["500 m", 9800]], colors: pick("blanco", "negro", "crudo", "gris", "azul", "rojo", "cafe", "beige") },
      ] },
    ],
  },
  {
    name: "Lanas", color: "#F59E0B", icon: "needles",
    subs: [
      { name: "Lana para tejer", color: "#D97706", icon: "needles", families: [
        { name: "Lana merino", sizes: [["50 g", 12900], ["100 g", 23900]], colors: pick("crudo", "gris", "negro", "rojo", "azul", "verde", "cafe", "beige", "rosado", "lila") },
      ] },
      { name: "Lana gruesa", color: "#B45309", icon: "yarn", families: [
        { name: "Lana chunky", sizes: [["200 g", 28900]], colors: pick("crudo", "gris", "negro", "rosado", "menta", "amarillo") },
      ] },
    ],
  },
  {
    name: "Accesorios", color: "#10B981", icon: "accessories",
    subs: [
      { name: "Ganchillos", color: "#059669", icon: "crochet", families: [
        { name: "Ganchillo de aluminio", sizes: [["2 mm", 4500], ["3 mm", 4500], ["4 mm", 4900], ["5 mm", 5200], ["6 mm", 5500]], colors: [] },
      ] },
      { name: "Agujas de tejer", color: "#0D9488", icon: "needles", families: [
        { name: "Agujas de bambú", sizes: [["4 mm", 9900], ["5 mm", 10900], ["6 mm", 11900]], colors: [] },
      ] },
      { name: "Tijeras y otros", color: "#64748B", icon: "box", families: [
        { name: "Tijeras de bordar", sizes: [["", 12900]], colors: [] },
        { name: "Marcadores de puntos", sizes: [["Paquete x 20", 6900]], colors: [] },
      ] },
    ],
  },
];

/** Carga el catálogo de ejemplo de una tienda de hilos, con stock en la primera sede. */
export async function loadYarnShop(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  if (await db.posCategory.findFirst({ where: { companyId, parentId: null, name: "Hilos", active: true } })) {
    throw new AppError("CONFLICT", "El catálogo de la tienda de hilos ya está cargado.");
  }
  const site = await db.site.findFirst({ where: { companyId, active: true }, orderBy: { createdAt: "asc" } });
  let variants = 0;
  for (const [ci, cat] of YARN_SHOP.entries()) {
    const parent = await db.posCategory.create({ data: { companyId, name: cat.name, color: cat.color, icon: cat.icon, sortOrder: ci } });
    for (const [si, sub] of cat.subs.entries()) {
      const child = await db.posCategory.create({ data: { companyId, parentId: parent.id, name: sub.name, color: sub.color, icon: sub.icon, sortOrder: si } });
      for (const fam of sub.families) {
        const r = await createPosFamily(actor, {
          subcategoryId: child.id, name: fam.name, taxRate: 19, siteId: site?.id ?? null, initialStock: 0,
          sizes: fam.sizes.map(([label, price]) => ({ label, price: Math.round(price / 1.19) })), colors: fam.colors,
        });
        variants += r.created;
      }
    }
  }
  // Stock de ejemplo (algunos agotados, para verlo en pantalla).
  if (site) {
    const products = await db.product.findMany({ where: { companyId, posCategoryId: { not: null } }, select: { id: true }, orderBy: { sku: "asc" } });
    await db.stockMovement.createMany({
      data: products.map((p, i) => ({ companyId, productId: p.id, siteId: site.id, type: "IN" as const, quantity: i % 13 === 5 ? 0 : 4 + ((i * 7) % 22), reason: "Inventario inicial", createdById: actor.userId })).filter((m) => m.quantity > 0),
    });
  }
  await audit({ companyId, actorUserId: actor.userId, action: "pos.demo_yarn", entityType: "company", entityId: companyId, after: { variants } });
  return { variants };
}

// ───────────────────────────── Cobrar ─────────────────────────────

const checkoutSchema = z.object({
  siteId: z.uuid({ error: "Elige la sede." }),
  method: z.enum(METHODS),
  items: z.array(z.object({ productId: z.uuid(), quantity: z.coerce.number().int({ error: "Cantidad inválida." }).positive().max(10_000) })).min(1, { error: "Agrega al menos un producto." }).max(100),
  received: z.coerce.number().min(0).max(1_000_000_000).optional(),
});

/** Cobra la venta del POS (cliente: consumidor final) con la venta normal de Nexora. */
export async function posCheckout(actor: Actor, input: unknown) {
  requireCompanyAdmin(actor);
  const r = checkoutSchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", r.error.issues[0]!.message);
  const v = r.data;
  const sale = await createSale(actor, { siteId: v.siteId, paymentMethod: v.method, customerMode: "final", notes: "Punto de venta", items: v.items.map((i) => ({ productId: i.productId, quantity: i.quantity, discount: 0 })) });
  const change = v.method === "CASH" && v.received != null ? Math.max(0, v.received - sale.total) : null;
  if (v.method === "CASH" && v.received != null && v.received < sale.total) {
    // La venta ya quedó; solo se avisa (no debería pasar: la pantalla no deja cobrar con menos).
    return { ...sale, change: 0, short: sale.total - v.received };
  }
  return { ...sale, change, short: 0 };
}
