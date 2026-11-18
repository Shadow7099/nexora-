/**
 * Caja: ingresos y egresos por sede y día, totales por medio de pago, cierre
 * con arqueo (esperado vs. contado), día bloqueado tras cerrar, reapertura con
 * motivo, saldo inicial desde el cierre anterior, anulación (nunca borrado) y
 * aislamiento entre empresas.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addCashMovement, cashDay, closeCashDay, reopenCashDay, voidCashMovement } from "@/server/cash";
import { AppError } from "@/server/errors";
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
const NOW = new Date("2026-11-18T20:00:00Z"); // 3:00 p. m. en Bogotá
const TODAY = "2026-11-18";
const YESTERDAY = "2026-11-17";

async function setup(tag: string) {
  const f = await makeCompany(tag);
  const admin = await login(f.admin.email);
  const add = (o: Record<string, unknown>) => addCashMovement(admin.actor, { siteId: f.site.id, date: TODAY, type: "IN", category: "Ventas", method: "CASH", amount: "1000", ...o }, NOW);
  const close = (o: Record<string, unknown>) => closeCashDay(admin.actor, { siteId: f.site.id, date: TODAY, ...o }, NOW);
  const view = (fecha = TODAY) => cashDay(admin.actor, { sede: f.site.id, fecha }, NOW);
  return { ...f, admin, add, close, view, emp: await login(f.empUser.email) };
}

describe("caja del día", () => {
  it("suma por medio de pago, el esperado solo cuenta efectivo y el cierre bloquea el día", async () => {
    const s = await setup("caj1");
    await s.add({ amount: "150000" });
    await s.add({ amount: "80000", method: "TRANSFER" });
    await s.add({ amount: "45000", method: "CARD" });
    await s.add({ type: "OUT", category: "Compras", amount: "30000", description: "Harina" });
    const v = await s.view();
    expect(v.totals).toMatchObject({ totalIn: 275_000, totalOut: 30_000, cashIn: 150_000, cashOut: 30_000 });
    expect(v.totals!.byMethod.TRANSFER.in).toBe(80_000);
    expect(v).toMatchObject({ expected: 120_000, editable: true, opening: { amount: 0, from: null } });

    // No cuadra: exige explicar la diferencia.
    await expect(s.close({ counted: "118000" })).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { notes: expect.stringContaining("faltan $ 2.000") } });
    expect(await s.close({ counted: "118000", notes: "Faltante en vueltas" })).toMatchObject({ expected: 120_000, counted: 118_000, difference: -2_000 });
    expect(await s.view()).toMatchObject({ editable: false, closing: { difference: -2000, notes: "Faltante en vueltas" } });

    // Día cerrado: no se registra, no se anula, no se cierra dos veces.
    expect(await code(s.add({ amount: "1" }))).toBe("CONFLICT");
    const m = await db.cashMovement.findFirstOrThrow({ where: { siteId: s.site.id } });
    expect(await code(voidCashMovement(s.admin.actor, m.id, "Error de digitación"))).toBe("CONFLICT");
    expect(await code(s.close({ counted: "118000", notes: "Otra vez" }))).toBe("CONFLICT");
    expect(await db.auditLog.count({ where: { companyId: s.company.id, action: { startsWith: "cash." } } })).toBe(5);
  });

  it("el saldo inicial es lo contado en el cierre anterior; reabrir exige motivo y solo el último", async () => {
    const s = await setup("caj2");
    await s.add({ date: YESTERDAY, amount: "50000" });
    await s.close({ date: YESTERDAY, counted: "50000" });
    await s.add({ amount: "20000" });
    expect(await s.view()).toMatchObject({ opening: { amount: 50_000, from: YESTERDAY }, expected: 70_000 });
    const today = await s.close({ counted: "70000" });

    // Reabrir ayer no se puede mientras hoy esté cerrado (cambiaría el saldo inicial de hoy).
    const yClosing = await db.cashClosing.findFirstOrThrow({ where: { siteId: s.site.id, date: new Date(`${YESTERDAY}T00:00:00Z`) } });
    expect(await code(reopenCashDay(s.admin.actor, yClosing.id, "Corregir ayer"))).toBe("CONFLICT");
    await expect(reopenCashDay(s.admin.actor, today.id, "")).rejects.toMatchObject({ code: "VALIDATION" });
    await reopenCashDay(s.admin.actor, today.id, "Faltó registrar un gasto");
    expect(await code(reopenCashDay(s.admin.actor, today.id, "Otra vez"))).toBe("CONFLICT");
    await s.add({ type: "OUT", category: "Transporte", amount: "5000" });
    expect(await s.close({ counted: "65000" })).toMatchObject({ expected: 65_000, difference: 0 });
    const v = await s.view();
    expect(v.recent!.map((c) => [c.date, c.reopened ? "reabierto" : "vigente"])).toEqual([[TODAY, "vigente"], [TODAY, "reabierto"], [YESTERDAY, "vigente"]]);
  });

  it("anular deja el movimiento visible y lo saca de los totales; la base no deja borrar ni editar", async () => {
    const s = await setup("caj3");
    const m = await s.add({ amount: "40000" });
    await expect(voidCashMovement(s.admin.actor, m.id, "no")).rejects.toMatchObject({ code: "VALIDATION" });
    await voidCashMovement(s.admin.actor, m.id, "Se registró dos veces");
    expect(await code(voidCashMovement(s.admin.actor, m.id, "Otra anulación"))).toBe("CONFLICT");
    const v = await s.view();
    expect(v.movements![0]).toMatchObject({ amount: 40000, voided: { reason: "Se registró dos veces" } });
    expect(v.totals!.totalIn).toBe(0);

    await expect(db.cashMovement.delete({ where: { id: m.id } })).rejects.toThrow();
    await expect(db.cashMovement.update({ where: { id: m.id }, data: { amount: 1 } })).rejects.toThrow();
    const c = await s.close({ counted: "0" });
    await expect(db.cashClosing.update({ where: { id: c.id }, data: { counted: 999 } })).rejects.toThrow();
    await expect(db.cashClosing.delete({ where: { id: c.id } })).rejects.toThrow();
  });

  it("valida fechas, valores y sedes; aislamiento entre empresas; un empleado no entra", async () => {
    const a = await setup("caj4");
    const b = await setup("caj5");
    await expect(a.add({ date: "2026-11-19" })).rejects.toMatchObject({ fieldErrors: { date: expect.stringContaining("futura") } });
    await expect(a.add({ date: "2026-08-01" })).rejects.toMatchObject({ fieldErrors: { date: expect.stringContaining("60 días") } });
    await expect(a.add({ amount: "0", category: "", method: "BITCOIN" })).rejects.toMatchObject({
      code: "VALIDATION", fieldErrors: { amount: expect.any(String), category: expect.any(String), method: expect.any(String) },
    });
    await expect(a.add({ siteId: b.site.id })).rejects.toMatchObject({ fieldErrors: { siteId: expect.any(String) } });
    const m = await a.add({});
    expect(await code(voidCashMovement(b.admin.actor, m.id, "Intento ajeno"))).toBe("NOT_FOUND");
    expect((await cashDay(b.admin.actor, { sede: a.site.id, fecha: TODAY }, NOW)).site?.id).toBe(b.site.id); // no ve la sede ajena
    expect(await code(cashDay(a.emp.actor, {}, NOW))).toBe("FORBIDDEN");
    expect(await code(addCashMovement(a.emp.actor, {}, NOW))).toBe("FORBIDDEN");
  });

  it("dos cierres simultáneos del mismo día: solo uno queda", async () => {
    const s = await setup("caj6");
    await s.add({ amount: "10000" });
    const r = await Promise.allSettled([s.close({ counted: "10000" }), s.close({ counted: "10000" }), s.close({ counted: "10000" })]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.cashClosing.count({ where: { siteId: s.site.id } })).toBe(1);
  });
});
