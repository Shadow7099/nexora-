/**
 * Punto de venta visual: catálogo (categorías, subcategorías, productos con
 * gramajes y colores como variantes del inventario), tienda de hilos de
 * ejemplo y cobro con la venta normal (stock, caja y número), con aislamiento.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/server/errors";
import { createPosFamily, hidePosCategory, loadYarnShop, posCatalog, posCheckout, savePosCategory } from "@/server/pos";
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
async function setup(tag: string) {
  const f = await makeCompany(tag);
  return { ...f, admin: await login(f.admin.email) };
}

describe("punto de venta", () => {
  it("tienda de hilos de ejemplo: categorías, subcategorías, variantes por gramaje y color, con stock", async () => {
    const s = await setup("pos1");
    const r = await loadYarnShop(s.admin.actor);
    expect(r.variants).toBeGreaterThan(100);
    const c = await posCatalog(s.admin.actor);
    expect(c.categories.filter((x) => !x.parentId).map((x) => x.name)).toEqual(["Hilos", "Lanas", "Accesorios"]);
    const crochet = c.categories.find((x) => x.name === "Hilos de crochet")!;
    const algodon = c.products.filter((p) => p.posCategoryId === crochet.id && p.posGroup === "Algodón mercerizado");
    expect(new Set(algodon.map((p) => p.variantSize))).toEqual(new Set(["50 g", "100 g", "125 g"]));
    expect(algodon.length).toBe(3 * 12);
    expect(new Set(algodon.map((p) => p.sku)).size).toBe(36);
    expect(algodon.filter((p) => p.variantSize === "50 g").map((p) => p.variantColor)).toEqual(expect.arrayContaining(["Verde", "Verde menta"]));
    const rojo50 = algodon.find((p) => p.variantSize === "50 g" && p.variantColor === "Rojo")!;
    expect(rojo50).toMatchObject({ variantHex: "#DC2626", finalPrice: 6500, name: "Algodón mercerizado 50 g Rojo" });
    expect(c.products.some((p) => p.stock === 0)).toBe(true); // hay agotados para verlo en pantalla
    expect(await code(loadYarnShop(s.admin.actor))).toBe("CONFLICT");
  });

  it("producto con variantes: un SKU por gramaje × color, precio por gramaje y stock inicial", async () => {
    const s = await setup("pos2");
    const cat = await savePosCategory(s.admin.actor, { name: "Hilos", color: "#EC4899", icon: "yarn" });
    const sub = await savePosCategory(s.admin.actor, { name: "Hilos de crochet", parentId: cat, color: "#DB2777", icon: "crochet" });
    // Solo dos niveles.
    expect(await code(savePosCategory(s.admin.actor, { name: "Nivel 3", parentId: sub, color: "#000000", icon: "box" }))).toBe("VALIDATION");
    const r = await createPosFamily(s.admin.actor, {
      subcategoryId: sub, name: "Algodón", taxRate: 19, initialStock: 5,
      sizes: [{ label: "50 g", price: 5462 }, { label: "100 g", price: 10000 }],
      colors: [{ name: "Rojo", hex: "#DC2626" }, { name: "Azul", hex: "#1D4ED8" }],
    });
    expect(r.created).toBe(4);
    const products = await db.product.findMany({ where: { companyId: s.company.id }, orderBy: { sku: "asc" } });
    expect(products.map((p) => p.sku)).toEqual(["HIHI-ALGO-100G-AZUL", "HIHI-ALGO-100G-ROJO", "HIHI-ALGO-50G-AZUL", "HIHI-ALGO-50G-ROJO"]);
    expect((await posCatalog(s.admin.actor)).products.every((p) => p.stock === 5)).toBe(true);
    // Repetirlo no duplica.
    expect((await createPosFamily(s.admin.actor, { subcategoryId: sub, name: "Algodón", sizes: [{ label: "50 g", price: 1 }], colors: [{ name: "Rojo", hex: "#DC2626" }] })).created).toBe(0);
    // En una categoría principal no se puede (debe ser subcategoría).
    expect(await code(createPosFamily(s.admin.actor, { subcategoryId: cat, name: "X", sizes: [{ label: "", price: 1 }], colors: [] }))).toBe("VALIDATION");
    await hidePosCategory(s.admin.actor, cat);
    expect((await posCatalog(s.admin.actor)).categories).toHaveLength(0);
  });

  it("cobrar: venta numerada, descuenta stock, entra a la caja y calcula la devuelta; no vende más de lo que hay", async () => {
    const s = await setup("pos3");
    await loadYarnShop(s.admin.actor);
    const c = await posCatalog(s.admin.actor);
    const p = c.products.find((x) => x.name === "Algodón mercerizado 50 g Rojo")!;
    const stockBefore = p.stock!;
    const sale = await posCheckout(s.admin.actor, { siteId: c.site!.id, method: "CASH", items: [{ productId: p.id, quantity: 2 }], received: 20000 });
    expect(sale).toMatchObject({ label: "V-000001", total: 13000, change: 7000 });
    expect((await posCatalog(s.admin.actor)).products.find((x) => x.id === p.id)!.stock).toBe(stockBefore - 2);
    expect(await db.cashMovement.count({ where: { companyId: s.company.id, source: "SALE", sourceId: sale.id } })).toBe(1);
    expect(await code(posCheckout(s.admin.actor, { siteId: c.site!.id, method: "CARD", items: [{ productId: p.id, quantity: 999 }] }))).toBe("CONFLICT");
    // Otra empresa no cobra productos ajenos.
    const other = await setup("pos3b");
    const otherSite = (await posCatalog(other.admin.actor)).site!;
    expect(await code(posCheckout(other.admin.actor, { siteId: otherSite.id, method: "CASH", items: [{ productId: p.id, quantity: 1 }] }))).toBe("VALIDATION");
    expect(await code(hidePosCategory(other.admin.actor, c.categories[0]!.id))).toBe("NOT_FOUND");
  });
});
