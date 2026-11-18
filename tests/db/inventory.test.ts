/**
 * Inventario: productos por empresa, stock por sede como suma de movimientos
 * inmutables, sin stock negativo (ni con salidas simultáneas), ajustes por
 * conteo, traslados y aislamiento entre empresas.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/server/errors";
import { createProduct, getProduct, listProducts, recordMovement, setProductActive, updateProduct } from "@/server/inventory";
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
const pan = { sku: "pan-01", name: "Pan tajado", category: "Panadería", kind: "PRODUCT", unit: "UNIDAD", price: "6500", cost: "", taxRate: "0", minStock: "10", barcode: "" };

async function setup(tag: string) {
  const f = await makeCompany(tag);
  const admin = await login(f.admin.email);
  const site2 = await db.site.create({ data: { companyId: f.company.id, name: `Bodega ${tag}`, address: "Dir", city: "Ciudad", latitude: 4.15, longitude: -73.62 } });
  const product = await createProduct(admin.actor, pan);
  const move = (o: Record<string, unknown>) => recordMovement(admin.actor, { productId: product.id, siteId: f.site.id, reason: "Movimiento de prueba", ...o });
  return { ...f, admin, site2, product, move, emp: await login(f.empUser.email) };
}

describe("productos", () => {
  it("valida, normaliza el código y no repite SKU en la misma empresa", async () => {
    const s = await setup("inv1");
    expect(s.product).toMatchObject({ sku: "PAN-01", name: "Pan tajado", unit: "UNIDAD" });
    await expect(createProduct(s.admin.actor, { ...pan, sku: "pan 01", price: "-1", name: "" })).rejects.toMatchObject({
      code: "VALIDATION", fieldErrors: { sku: expect.any(String), price: expect.any(String), name: expect.any(String) },
    });
    await expect(createProduct(s.admin.actor, { ...pan, sku: "PAN-01" })).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { sku: expect.stringContaining("ya existe") } });
    // Otra empresa sí puede usar el mismo código.
    const other = await setup("inv2");
    expect(other.product.sku).toBe("PAN-01");

    const svc = await createProduct(s.admin.actor, { ...pan, sku: "DOMICILIO", name: "Domicilio", kind: "SERVICE", unit: "SERVICIO", minStock: "5" });
    expect(Number(svc.minStock)).toBe(0); // los servicios no llevan stock
    expect(await code(recordMovement(s.admin.actor, { productId: svc.id, siteId: s.site.id, type: "IN", quantity: "1", reason: "No aplica" }))).toBe("CONFLICT");

    await updateProduct(s.admin.actor, s.product.id, { ...pan, name: "Pan tajado grande", price: "7000" });
    expect((await getProduct(s.admin.actor, s.product.id)).product).toMatchObject({ name: "Pan tajado grande", price: 7000 });
    expect(await db.auditLog.count({ where: { companyId: s.company.id, entityType: "product" } })).toBe(3);
  });
});

describe("movimientos y stock", () => {
  it("entrada, salida, ajuste por conteo y traslado; el stock es la suma de movimientos", async () => {
    const s = await setup("inv3");
    expect(await s.move({ type: "IN", quantity: "50", unitCost: "4000", reason: "Compra a proveedor", reference: "FAC-123" })).toMatchObject({ before: 0, after: 50 });
    expect(Number((await db.product.findUniqueOrThrow({ where: { id: s.product.id } })).cost)).toBe(4000); // costo de la última compra
    expect(await s.move({ type: "OUT", quantity: "8", reason: "Producto vencido" })).toMatchObject({ delta: -8, after: 42 });
    // Conteo físico: hay 40, el sistema dice 42 → ajuste de −2.
    expect(await s.move({ type: "ADJUST", quantity: "40", reason: "Conteo de fin de mes" })).toMatchObject({ delta: -2, after: 40 });
    await expect(s.move({ type: "ADJUST", quantity: "40", reason: "Conteo repetido" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("coincide") });
    await s.move({ type: "TRANSFER", quantity: "15", toSiteId: s.site2.id, reason: "Surtir bodega" });

    const p = await getProduct(s.admin.actor, s.product.id);
    expect(p.total).toBe(40);
    expect(Object.fromEntries(p.bySite.map((b) => [b.name, b.qty]))).toEqual({ [s.site.name]: 25, [s.site2.name]: 15 });
    expect(p.movements.map((m) => m.type)).toEqual(expect.arrayContaining(["IN", "OUT", "ADJUST", "TRANSFER_OUT", "TRANSFER_IN"]));
    const transfer = await db.stockMovement.findMany({ where: { productId: s.product.id, transferId: { not: null } } });
    expect(new Set(transfer.map((t) => t.transferId)).size).toBe(1);

    const list = await listProducts(s.admin.actor);
    expect(list.rows[0]).toMatchObject({ stock: 40, low: false, value: 40 * 4000 });
    expect(list.summary).toMatchObject({ products: 1, low: 0, value: 160_000 });
    expect((await listProducts(s.admin.actor, { sede: s.site2.id })).rows[0]!.stock).toBe(15);
    expect((await listProducts(s.admin.actor, { q: "tajado" })).rows).toHaveLength(1);
    expect((await listProducts(s.admin.actor, { q: "no-existe" })).rows).toHaveLength(0);
    await s.move({ type: "OUT", quantity: "15", reason: "Venta mayorista" });
    await s.move({ type: "OUT", quantity: "15", siteId: s.site2.id, reason: "Venta mayorista" }); // quedan 10 = mínimo
    expect((await listProducts(s.admin.actor, { bajo: "1" })).rows.map((r) => r.sku)).toEqual(["PAN-01"]);
  });

  it("no deja el stock en negativo, ni con salidas simultáneas; valida cantidades", async () => {
    const s = await setup("inv4");
    await s.move({ type: "IN", quantity: "5" });
    await expect(s.move({ type: "OUT", quantity: "6" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Solo hay 5") });
    const r = await Promise.allSettled(Array.from({ length: 4 }, () => s.move({ type: "OUT", quantity: "2" })));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(2);
    expect((await getProduct(s.admin.actor, s.product.id)).total).toBe(1);

    await expect(s.move({ type: "IN", quantity: "1.5" })).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { quantity: expect.stringContaining("entero") } });
    await expect(s.move({ type: "IN", quantity: "0" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(s.move({ type: "TRANSFER", quantity: "1", toSiteId: s.site.id })).rejects.toMatchObject({ fieldErrors: { toSiteId: expect.any(String) } });
    await expect(s.move({ type: "IN", quantity: "1", reason: "" })).rejects.toMatchObject({ fieldErrors: { reason: expect.any(String) } });

    await setProductActive(s.admin.actor, s.product.id, false);
    expect(await code(s.move({ type: "IN", quantity: "1" }))).toBe("CONFLICT");
    expect((await listProducts(s.admin.actor)).rows).toHaveLength(0);
    expect((await listProducts(s.admin.actor, { inactivos: "1" })).rows).toHaveLength(1);
  });

  it("los movimientos no se pueden editar ni borrar en la base", async () => {
    const s = await setup("inv5");
    const m = await s.move({ type: "IN", quantity: "3" });
    await expect(db.stockMovement.update({ where: { id: m.id }, data: { quantity: 300 } })).rejects.toThrow();
    await expect(db.stockMovement.delete({ where: { id: m.id } })).rejects.toThrow();
    await expect(db.$executeRaw`UPDATE stock_movement SET quantity = 0 WHERE id = ${m.id}::uuid`).rejects.toThrow();
  });

  it("aislamiento: otra empresa no ve ni mueve productos ajenos ni usa sedes ajenas; un empleado no entra", async () => {
    const a = await setup("inv6");
    const b = await setup("inv7");
    expect(await code(getProduct(b.admin.actor, a.product.id))).toBe("NOT_FOUND");
    expect(await code(updateProduct(b.admin.actor, a.product.id, pan))).toBe("NOT_FOUND");
    expect(await code(recordMovement(b.admin.actor, { productId: a.product.id, siteId: b.site.id, type: "IN", quantity: "1", reason: "Intento ajeno" }))).toBe("NOT_FOUND");
    // Producto propio en sede ajena: rechazado.
    await expect(a.move({ type: "IN", quantity: "1", siteId: b.site.id })).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { siteId: expect.any(String) } });
    expect((await listProducts(b.admin.actor)).rows.map((r) => r.id)).not.toContain(a.product.id);
    expect(await code(listProducts(a.emp.actor))).toBe("FORBIDDEN");
    expect(await code(createProduct(a.emp.actor, pan))).toBe("FORBIDDEN");
  });
});
