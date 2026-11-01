/**
 * Fase 6 · pre-nómina persistida: datos reales de la BD → estimación guardada
 * con su copia de parámetros; aislamiento entre empresas; parámetro faltante;
 * versiones de parámetros (solo superadmin).
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addManualSession } from "@/server/corrections";
import { AppError } from "@/server/errors";
import { decideOvertime } from "@/server/overtime";
import { addLaborParameterVersion, computePayroll, getPayrollEstimate, listLaborParameters, payrollOverview, verifyLaborParameter } from "@/server/payroll";
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
const P1 = { start: "2026-10-01", end: "2026-10-15" };
const reason = "Registro de prueba de pre-nómina";

async function setup(tag: string) {
  const f = await makeCompany(tag); // L–V 8:00–17:00, descanso 60 no remunerado; salario 2.000.000, 42 h
  const admin = await login(f.admin.email);
  return { ...f, admin };
}

describe("fase 6 · pre-nómina con datos de la base", () => {
  it("festivo trabajado y horas extra aprobadas parcialmente quedan en la estimación", async () => {
    const s = await setup("p6a");
    // Lunes 12 oct. 2026 es festivo y el empleado tiene turno: 8 h ordinarias (9 h − 1 h de descanso) al 90 %.
    await addManualSession(s.admin.actor, s.employee.id, { date: "2026-10-12", startTime: "08:00", endTime: "17:00", siteId: s.site.id, reason });
    // Miércoles 14: 8:00–19:00 → 120 min detectados; se aprueban 60.
    await addManualSession(s.admin.actor, s.employee.id, { date: "2026-10-14", startTime: "08:00", endTime: "19:00", siteId: s.site.id, reason });
    const ot = await db.overtimeRequest.findFirstOrThrow({ where: { employeeId: s.employee.id, status: "PENDING" } });
    expect(ot.detectedMinutes).toBe(120);
    await decideOvertime(s.admin.actor, ot.id, { decision: "approve", approvedMinutes: "60", note: "Solo una hora autorizada" });

    const r = await computePayroll(s.admin.actor, P1);
    expect(r).toMatchObject({ employees: 1, blocked: 0 });
    const o = await payrollOverview(s.admin.actor, P1);
    expect(o.estimates).toHaveLength(1);
    const e = await getPayrollEstimate(s.admin.actor, o.estimates[0]!.id);
    const amt = (c: string) => e.lines.filter((l) => l.concept === c).reduce((a, l) => a + l.amount, 0);
    expect(amt("SALARIO_BASICO")).toBe(1_000_000);
    expect(amt("RDF")).toBe(68_571); // 8 × 9.523,81 × 0,90
    expect(amt("HED")).toBe(11_905); // 1 × 9.523,81 × 1,25
    expect(amt("AUX_TRANSPORTE")).toBe(124_548);
    expect(e.gross).toBe(1_000_000 + 68_571 + 11_905 + 124_548);
    expect(e.lines[0]!.concept).toBe("SALARIO_BASICO");
    // El tiempo registrado no cambió: la jornada sigue de 11 h.
    const ws = await db.workSession.findMany({ where: { employeeId: s.employee.id }, orderBy: { startAt: "asc" } });
    expect(ws.map((w) => (w.endAt!.getTime() - w.startAt.getTime()) / 60000)).toEqual([540, 660]);
    // Copia de parámetros y explicación por línea.
    expect(e.snapshot.parameters.map((p) => p.key)).toEqual(expect.arrayContaining(["SMMLV", "RECARGO_DOMINICAL_FESTIVO", "HE_DIURNA"]));
    expect(e.lines.find((l) => l.concept === "HED")!.basis).toContain("valor hora");

    // Recalcular reemplaza (no duplica) y queda auditado.
    await computePayroll(s.admin.actor, P1);
    expect(await db.payrollEstimate.count({ where: { companyId: s.company.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { companyId: s.company.id, action: "payroll.compute" } })).toBe(2);
  });

  it("extras sin decidir y jornadas por revisar se advierten y no se pagan como extra", async () => {
    const s = await setup("p6b");
    await addManualSession(s.admin.actor, s.employee.id, { date: "2026-10-14", startTime: "08:00", endTime: "19:00", siteId: s.site.id, reason });
    await computePayroll(s.admin.actor, P1);
    const o = await payrollOverview(s.admin.actor, P1);
    expect(o.estimates[0]!.warnings.map((w) => w.code)).toContain("OVERTIME_PENDING");
    const e = await getPayrollEstimate(s.admin.actor, o.estimates[0]!.id);
    expect(e.lines.some((l) => l.concept.startsWith("HE"))).toBe(false);
  });

  it("la exoneración del art. 114-1 se toma de la configuración de la empresa", async () => {
    const s = await setup("p6c");
    await db.company.update({ where: { id: s.company.id }, data: { parafiscalExempt: true } });
    await computePayroll(s.admin.actor, P1);
    const o = await payrollOverview(s.admin.actor, P1);
    const e = await getPayrollEstimate(s.admin.actor, o.estimates[0]!.id);
    expect(e.lines.filter((l) => ["SALUD_EMPLEADOR", "ICBF", "SENA"].includes(l.concept)).map((l) => l.amount)).toEqual([0, 0, 0]);
  });

  it("sin parámetros para la fecha: queda bloqueada, sin números", async () => {
    const s = await setup("p6d");
    await db.employeeContract.updateMany({ where: { employeeId: s.employee.id }, data: { startDate: new Date("2024-01-01T00:00:00Z") } });
    const r = await computePayroll(s.admin.actor, { start: "2024-03-01", end: "2024-03-15" });
    expect(r.blocked).toBe(1);
    const o = await payrollOverview(s.admin.actor, { start: "2024-03-01", end: "2024-03-15" });
    expect(o.estimates[0]).toMatchObject({ blocked: true, gross: 0, net: 0, employerCost: 0 });
    expect(o.estimates[0]!.warnings[0]).toMatchObject({ code: "MISSING_PARAMETER" });
    expect(o.totals.employerCost).toBe(0);
  });

  it("valida el período (quincena o mes completo)", async () => {
    const s = await setup("p6e");
    expect(await code(computePayroll(s.admin.actor, { start: "2026-10-03", end: "2026-10-20" }))).toBe("VALIDATION");
    expect(await code(computePayroll(s.admin.actor, { start: "2026-10-01", end: "2026-10-31" }))).toBe("OK");
  });

  it("aislamiento: otra empresa no ve ni calcula la pre-nómina ajena; un empleado no tiene acceso", async () => {
    const a = await setup("p6f");
    const b = await setup("p6g");
    await computePayroll(a.admin.actor, P1);
    const oa = await payrollOverview(a.admin.actor, P1);
    expect(await code(getPayrollEstimate(b.admin.actor, oa.estimates[0]!.id))).toBe("NOT_FOUND");
    await computePayroll(b.admin.actor, P1);
    const ob = await payrollOverview(b.admin.actor, P1);
    expect(ob.estimates.map((e) => e.employee.id)).toEqual([b.employee.id]);
    const emp = await login(a.empUser.email);
    expect(await code(computePayroll(emp.actor, P1))).toBe("FORBIDDEN");
    expect(await code(getPayrollEstimate(emp.actor, oa.estimates[0]!.id))).toBe("FORBIDDEN");
  });
});

describe("fase 6 · parámetros legales", () => {
  it("la migración carga los parámetros nacionales con norma y URL, sin validar", async () => {
    const s = await setup("p6h");
    const rows = await listLaborParameters(s.admin.actor);
    const smmlv = rows.find((r) => r.key === "SMMLV" && r.validFrom.toISOString().startsWith("2026"));
    expect(smmlv).toMatchObject({ value: 1_750_905, unit: "COP", companyId: null, verifiedAt: null, label: expect.stringContaining("Salario mínimo") });
    expect(rows.every((r) => r.legalSource.length > 5 && r.sourceUrl?.startsWith("http"))).toBe(true);
  });

  it("solo el superadministrador valida y agrega versiones; la anterior se cierra sin borrarse", async () => {
    const s = await setup("p6i");
    await db.user.create({ data: { email: `sa-p6-${s.company.id}@test.local`, name: "SA", passwordHash: (await db.user.findUniqueOrThrow({ where: { id: s.admin.actor.userId } })).passwordHash, role: "SUPERADMIN" } });
    const sa = await login(`sa-p6-${s.company.id}@test.local`);
    const target = (await listLaborParameters(sa.actor)).find((r) => r.key === "CAJA_COMPENSACION")!;

    expect(await code(verifyLaborParameter(s.admin.actor, target.id))).toBe("FORBIDDEN");
    await verifyLaborParameter(sa.actor, target.id, new Date("2026-11-02T15:00:00Z"));
    expect((await db.laborParameter.findUniqueOrThrow({ where: { id: target.id } })).verifiedAt?.toISOString().slice(0, 10)).toBe("2026-11-02");

    const input = { key: "CAJA_COMPENSACION", value: "4", validFrom: "2031-01-01", legalSource: "Norma de prueba 2031", sourceUrl: "https://example.org/norma" };
    expect(await code(addLaborParameterVersion(s.admin.actor, input))).toBe("FORBIDDEN");
    await expect(addLaborParameterVersion(sa.actor, { ...input, sourceUrl: "no-es-url" })).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { sourceUrl: expect.any(String) } });
    const created = await addLaborParameterVersion(sa.actor, input);
    expect(created).toMatchObject({ unit: "PERCENT", validTo: null });
    const prev = await db.laborParameter.findUniqueOrThrow({ where: { id: target.id } });
    expect(prev.validTo?.toISOString().slice(0, 10)).toBe("2030-12-31");
    expect(await code(addLaborParameterVersion(sa.actor, input))).toBe("CONFLICT");
    expect(await db.auditLog.count({ where: { action: { in: ["labor_parameter.verify", "labor_parameter.create"] }, actorUserId: sa.actor.userId } })).toBe(2);
  });
});
