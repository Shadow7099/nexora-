/**
 * Ventas: cálculo con IVA y descuento, numeración consecutiva sin huecos (también
 * con ventas simultáneas), descuento de stock, ingreso automático a la caja,
 * anulación que devuelve todo, inmutabilidad en la base y aislamiento.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addCashMovement, cashDay, closeCashDay, voidCashMovement } from "@/server/cash";
import { AppError } from "@/server/errors";
import { createProduct, getProduct, recordMovement } from "@/server/inventory";
import { computeLine, createSale, getSale, listSales, saleFormData, voidSale } from "@/server/sales";
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
const NOW = new Date("2026-11-18T20:00:00Z");
const TODAY = "2026-11-18";

async function setup(tag: string) {
  const f = await makeCompany(tag);
  const admin = await login(f.admin.email);
  const base = { category: "", unit: "UNIDAD", cost: "", minStock: "", barcode: "", kind: "PRODUCT" };
  const pan = await createProduct(admin.actor, { ...base, sku: "PAN", name: "Pan", price: "6500", taxRate: "19" });
  const cafe = await createProduct(admin.actor, { ...base, sku: "CAFE", name: "Café", price: "2000", taxRate: "0", kind: "SERVICE", unit: "SERVICIO" });
  await recordMovement(admin.actor, { productId: pan.id, siteId: f.site.id, type: "IN", quantity: "10", reason: "Inventario inicial" });
  const sell = (o: Record<string, unknown> = {}) =>
    createSale(admin.actor, { siteId: f.site.id, paymentMethod: "CASH", items: [{ productId: pan.id, quantity: 3, discount: 500 }, { productId: cafe.id, quantity: 2, discount: 0 }], ...o }, NOW);
  return { ...f, admin, pan, cafe, sell, emp: await login(f.empUser.email) };
}

describe("cálculo de un renglón", () => {
  it("subtotal con descuento, IVA sobre el subtotal y redondeo al peso", () => {
    expect(computeLine(3, 6500, 500, 19)).toEqual({ gross: 19500, subtotal: 19000, tax: 3610, total: 22610 });
    expect(computeLine(1, 2521, 0, 19)).toEqual({ gross: 2521, subtotal: 2521, tax: 479, total: 3000 }); // 478,99 → 479
    expect(computeLine(2.5, 1000, 0, 5)).toEqual({ gross: 2500, subtotal: 2500, tax: 125, total: 2625 });
    expect(computeLine(2, 2000, 0, 0)).toEqual({ gross: 4000, subtotal: 4000, tax: 0, total: 4000 });
  });
});

describe("ventas", () => {
  it("registra la venta: número, totales, stock y caja en un solo paso", async () => {
    const s = await setup("ven1");
    const r = await s.sell();
    expect(r).toMatchObject({ number: 1, label: "V-000001", total: 26_610 }); // 22.610 pan + 4.000 café
    const sale = await getSale(s.admin.actor, r.id);
    expect(sale).toMatchObject({ subtotal: 23_000, discountTotal: 500, taxTotal: 3_610, total: 26_610, customer: { name: "Consumidor final", doc: "222222222222" }, status: "COMPLETED" });
    expect(sale.items.map((i) => [i.sku, i.quantity, i.total])).toEqual([["PAN", 3, 22_610], ["CAFE", 2, 4_000]]);
    expect((await getProduct(s.admin.actor, s.pan.id)).total).toBe(7); // 10 − 3; el servicio no mueve stock
    expect(await db.stockMovement.count({ where: { productId: s.cafe.id } })).toBe(0);
    const day = await cashDay(s.admin.actor, { sede: s.site.id, fecha: TODAY }, NOW);
    expect(day.totals).toMatchObject({ cashIn: 26_610 });
    expect(day.movements![0]).toMatchObject({ category: "Ventas", source: "SALE", description: "V-000001 · Consumidor final" });

    expect((await s.sell({ paymentMethod: "TRANSFER", items: [{ productId: s.pan.id, quantity: 1 }] })).label).toBe("V-000002");
    expect((await listSales(s.admin.actor, {}, NOW)).summary).toMatchObject({ count: 2, todayCount: 2, total: 26_610 + 7_735 });
    expect((await listSales(s.admin.actor, { q: "V-000002" }, NOW)).sales.map((x) => x.label)).toEqual(["V-000002"]);
  });

  it("cliente nuevo con documento: se crea una vez y la siguiente venta lo reutiliza", async () => {
    const s = await setup("ven2");
    const customer = { name: "Rosa Pérez", documentType: "CC", documentNumber: "52123456", email: "rosa@correo.co", phone: "3001234567" };
    await s.sell({ customerMode: "new", customer });
    await s.sell({ customerMode: "new", customer: { ...customer, name: "Rosa Pérez Gómez", email: "" }, items: [{ productId: s.cafe.id, quantity: 1 }] });
    const all = await db.customer.findMany({ where: { companyId: s.company.id } });
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Rosa Pérez Gómez", email: "rosa@correo.co" }); // conserva el correo
    const sale = await s.sell({ customerMode: "existing", customerId: all[0]!.id, items: [{ productId: s.cafe.id, quantity: 1 }] });
    expect((await getSale(s.admin.actor, sale.id)).customer).toMatchObject({ name: "Rosa Pérez Gómez", doc: "CC 52123456", phone: "3001234567" });
    await expect(s.sell({ customerMode: "new", customer: { name: "X" } })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(s.sell({ customerMode: "new", customer: { name: "Sin tipo", documentNumber: "123" } })).rejects.toMatchObject({ fieldErrors: { "customer.documentType": expect.any(String) } });
    expect((await saleFormData(s.admin.actor)).customers).toHaveLength(1);
  });

  it("sin stock suficiente o con la caja cerrada no vende, y no gasta número", async () => {
    const s = await setup("ven3");
    await expect(s.sell({ items: [{ productId: s.pan.id, quantity: 11 }] })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("hay 10") });
    await expect(s.sell({ items: [{ productId: s.pan.id, quantity: 1.5 }] })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(s.sell({ items: [{ productId: s.pan.id, quantity: 1, discount: 99_999 }] })).rejects.toMatchObject({ code: "VALIDATION", message: expect.stringContaining("descuento") });
    await expect(s.sell({ items: [] })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(s.sell({ items: [{ productId: s.pan.id, quantity: 1 }, { productId: s.pan.id, quantity: 1 }] })).rejects.toMatchObject({ message: expect.stringContaining("repetido") });

    await addCashMovement(s.admin.actor, { siteId: s.site.id, date: TODAY, type: "IN", category: "Base", method: "CASH", amount: "1000" }, NOW);
    await closeCashDay(s.admin.actor, { siteId: s.site.id, date: TODAY, counted: "1000" }, NOW);
    await expect(s.sell()).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("cerrado") });
    expect(await db.sale.count({ where: { companyId: s.company.id } })).toBe(0);
    expect((await getProduct(s.admin.actor, s.pan.id)).total).toBe(10);
  });

  it("anular devuelve el stock y anula el ingreso de caja; no dos veces; el ingreso no se anula por separado", async () => {
    const s = await setup("ven4");
    const r = await s.sell();
    const cash = await db.cashMovement.findFirstOrThrow({ where: { source: "SALE", sourceId: r.id } });
    expect(await code(voidCashMovement(s.admin.actor, cash.id, "Intento directo"))).toBe("CONFLICT");
    await expect(voidSale(s.admin.actor, r.id, "")).rejects.toMatchObject({ code: "VALIDATION" });
    await voidSale(s.admin.actor, r.id, "El cliente devolvió todo");
    expect(await code(voidSale(s.admin.actor, r.id, "Otra vez"))).toBe("CONFLICT");
    expect((await getProduct(s.admin.actor, s.pan.id)).total).toBe(10);
    expect((await cashDay(s.admin.actor, { sede: s.site.id, fecha: TODAY }, NOW)).totals!.totalIn).toBe(0);
    expect(await getSale(s.admin.actor, r.id)).toMatchObject({ status: "VOIDED", voided: { reason: "El cliente devolvió todo" } });
    expect((await listSales(s.admin.actor, {}, NOW)).summary.count).toBe(0);
    // El número no se reutiliza.
    expect((await s.sell({ items: [{ productId: s.cafe.id, quantity: 1 }] })).label).toBe("V-000002");
  });

  it("ventas simultáneas: números consecutivos sin repetir y sin vender más de lo que hay", async () => {
    const s = await setup("ven5");
    const r = await Promise.allSettled(Array.from({ length: 6 }, () => s.sell({ items: [{ productId: s.pan.id, quantity: 2 }] })));
    const ok = r.filter((x): x is PromiseFulfilledResult<Awaited<ReturnType<typeof s.sell>>> => x.status === "fulfilled");
    expect(ok).toHaveLength(5); // 10 panes / 2
    expect(ok.map((x) => x.value.number).sort()).toEqual([1, 2, 3, 4, 5]);
    expect((await getProduct(s.admin.actor, s.pan.id)).total).toBe(0);
  });

  it("la base no deja borrar ni editar ventas ni sus renglones", async () => {
    const s = await setup("ven6");
    const r = await s.sell();
    await expect(db.sale.update({ where: { id: r.id }, data: { total: 1 } })).rejects.toThrow();
    await expect(db.sale.delete({ where: { id: r.id } })).rejects.toThrow();
    const item = await db.saleItem.findFirstOrThrow({ where: { saleId: r.id } });
    await expect(db.saleItem.update({ where: { id: item.id }, data: { quantity: 99 } })).rejects.toThrow();
  });

  it("aislamiento: productos, sedes, clientes y ventas de otra empresa; un empleado no vende", async () => {
    const a = await setup("ven7");
    const b = await setup("ven8");
    await expect(a.sell({ siteId: b.site.id })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(a.sell({ items: [{ productId: b.pan.id, quantity: 1 }] })).rejects.toMatchObject({ code: "VALIDATION" });
    const bSale = await b.sell({ customerMode: "new", customer: { name: "Cliente de B", documentType: "CC", documentNumber: "1" } });
    const bCustomer = await db.customer.findFirstOrThrow({ where: { companyId: b.company.id } });
    await expect(a.sell({ customerMode: "existing", customerId: bCustomer.id })).rejects.toMatchObject({ fieldErrors: { customerId: expect.any(String) } });
    expect(await code(getSale(a.admin.actor, bSale.id))).toBe("NOT_FOUND");
    expect(await code(voidSale(a.admin.actor, bSale.id, "Intento ajeno"))).toBe("NOT_FOUND");
    expect((await listSales(a.admin.actor, {}, NOW)).sales).toHaveLength(0);
    expect(await code(createSale(a.emp.actor, {}, NOW))).toBe("FORBIDDEN");
  });
});
