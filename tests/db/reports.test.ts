/**
 * Fase 7 · reportes con datos de la base.
 * PRUEBA OBLIGATORIA 7: los totales de cada reporte coinciden con la base de
 * datos (consultas SQL independientes) y con lo exportado a Excel y CSV.
 */
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/report-table";
import { addManualSession } from "@/server/corrections";
import { AppError } from "@/server/errors";
import { toPdf, toXlsx } from "@/server/export";
import { registerNovelty } from "@/server/novelties";
import { decideOvertime } from "@/server/overtime";
import { computePayroll } from "@/server/payroll";
import { buildReport, dashboard, parseFilters } from "@/server/reports";
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
const reason = "Registro de prueba de reportes";
const NOW = new Date("2026-10-20T17:00:00Z"); // martes 20 oct. 2026, 12:00 en Bogotá
const RANGE = { desde: "2026-10-12", hasta: "2026-10-18" };

async function setup(tag: string) {
  const f = await makeCompany(tag); // L–V 8:00–17:00 con 60 min de descanso
  const admin = await login(f.admin.email);
  const add = (date: string, startTime: string, endTime: string) =>
    addManualSession(admin.actor, f.employee.id, { date, startTime, endTime, siteId: f.site.id, reason }, NOW);
  await add("2026-10-12", "08:00", "17:00"); // a tiempo (festivo trabajado)
  await add("2026-10-13", "08:30", "17:00"); // 30 min tarde
  await add("2026-10-15", "08:00", "19:00"); // 120 min de más → se aprueban 60
  // 14 oct.: ausente · 16 oct.: vacaciones
  await registerNovelty(admin.actor, f.employee.id, { type: "VACACIONES", startDate: "2026-10-16", endDate: "2026-10-16" });
  const ot = await db.overtimeRequest.findFirstOrThrow({ where: { employeeId: f.employee.id, status: "PENDING" } });
  await decideOvertime(admin.actor, ot.id, { decision: "approve", approvedMinutes: "60" });
  return { ...f, admin };
}

describe("fase 7 · prueba obligatoria 7: totales del reporte = base de datos", () => {
  it("asistencia: horas trabajadas y tardanzas coinciden con las jornadas registradas", async () => {
    const s = await setup("r7a");
    const t = await buildReport(s.admin.actor, "asistencia", RANGE, NOW);
    const [db1] = await db.$queryRaw<{ minutes: number }[]>`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_at - start_at)) / 60), 0)::float AS minutes
      FROM work_session WHERE company_id = ${s.company.id}::uuid AND status = 'CLOSED'
        AND start_at >= '2026-10-12T05:00:00Z' AND start_at < '2026-10-19T05:00:00Z'`;
    expect(t.totals.worked).toBe(Math.round((db1!.minutes / 60) * 100) / 100); // 9 + 8,5 + 11 = 28,5 h
    expect(t.totals.worked).toBe(28.5);
    expect(t.totals.late).toBe(30);
    const status = Object.fromEntries(t.rows.map((r) => [r.date, r.status]));
    expect(status).toMatchObject({ "2026-10-12": "Asistió", "2026-10-13": "Llegó tarde", "2026-10-14": "Ausente", "2026-10-15": "Asistió", "2026-10-16": "Novedad" });
    expect(t.rows.find((r) => r.date === "2026-10-12")!.holiday).toBe("Día de la Raza");
    expect(t.meta).toMatchObject({ companyName: s.company.name, from: "2026-10-12", to: "2026-10-18" });

    // Los mismos números en Excel y CSV.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await toXlsx(t)) as unknown as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    const values = ws.getSheetValues().filter(Boolean) as unknown[][];
    const totalRow = values.find((r) => r[1] === "Total")!;
    const workedCol = t.columns.findIndex((c) => c.key === "worked") + 1;
    expect(totalRow[workedCol]).toBe(28.5);
    expect(String(values[0]![1])).toBe("Asistencia por período");
    expect(String(values[1]![1])).toContain(s.company.name);
    expect(values.filter((r) => typeof r[1] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r[1] as string))).toHaveLength(t.rows.length);
    expect(toCsv(t)).toContain("Total;;;;");
    expect(toPdf(t).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("horas extra: registrado y autorizado coinciden con overtime_request", async () => {
    const s = await setup("r7b");
    const t = await buildReport(s.admin.actor, "horas-extra", RANGE, NOW);
    const [agg] = await db.$queryRaw<{ detected: number; approved: number }[]>`
      SELECT SUM(detected_minutes)::int AS detected, SUM(CASE WHEN status = 'APPROVED' THEN approved_minutes ELSE 0 END)::int AS approved
      FROM overtime_request WHERE company_id = ${s.company.id}::uuid AND status <> 'CANCELLED' AND work_date BETWEEN '2026-10-12' AND '2026-10-18'`;
    expect(t.totals).toEqual({ detected: agg!.detected, approved: agg!.approved });
    expect(t.totals).toEqual({ detected: 120, approved: 60 });
    expect(t.rows[0]).toMatchObject({ status: "Aprobada", treatment: "Se paga como extra (lo aprobado)", decidedBy: expect.any(String) });
  });

  it("novedades y pre-nómina coinciden con sus tablas", async () => {
    const s = await setup("r7c");
    const nov = await buildReport(s.admin.actor, "novedades", RANGE, NOW);
    expect(nov.rows).toHaveLength(await db.novelty.count({ where: { companyId: s.company.id } }));
    expect(nov.totals.daysInRange).toBe(1);

    await computePayroll(s.admin.actor, { start: "2026-10-01", end: "2026-10-15" });
    const pn = await buildReport(s.admin.actor, "pre-nomina", { desde: "2026-10-01", hasta: "2026-10-15" }, NOW);
    const sum = await db.payrollEstimate.aggregate({ where: { companyId: s.company.id }, _sum: { employerCost: true, netEstimate: true } });
    expect(pn.totals.employerCost).toBe(Number(sum._sum.employerCost));
    expect(pn.totals.net).toBe(Number(sum._sum.netEstimate));
  });

  it("intentos rechazados: uno por fila, con su motivo", async () => {
    const s = await setup("r7d");
    await db.attendanceAttempt.create({ data: { companyId: s.company.id, userId: s.empUser.id, siteId: s.site.id, reason: "OUTSIDE_RADIUS", detail: { distance: 812.4, accuracy: 9 }, occurredAt: new Date("2026-10-14T13:00:00Z") } });
    const t = await buildReport(s.admin.actor, "intentos", RANGE, NOW);
    expect(t.rows).toEqual([expect.objectContaining({ reason: "Fuera del área de la sede", distance: 812, accuracy: 9, employee: expect.stringContaining("Ana") })]);
  });
});

describe("fase 7 · tablero, filtros y aislamiento", () => {
  it("indicadores del tablero con datos reales y comparación con el período anterior", async () => {
    const s = await setup("r7e");
    const d = await dashboard(s.admin.actor, RANGE, NOW);
    expect(d.summary).toMatchObject({ scheduledDays: 4, attendedDays: 3, absences: 1, lates: 1, workedMinutes: 1710 });
    expect(d.overtimeMinutes).toBe(60);
    expect(d.prevSummary.attendedDays).toBe(0);
    expect(d.prevRange).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(d.weekly).toHaveLength(1);
    expect(d.bySite).toEqual([{ site: s.site.name, hours: 28.5 }]);
  });

  it("los filtros validan fechas y rango; sede o empleado de otra empresa = NOT_FOUND", async () => {
    expect(parseFilters({ desde: "x", hasta: "2026-10-20" }, NOW)).toMatchObject({ from: "2026-09-21", to: "2026-10-20" });
    expect(parseFilters({ desde: "2026-10-20", hasta: "2026-10-01" }, NOW)).toMatchObject({ from: "2026-10-01", to: "2026-10-20" });
    expect(parseFilters({ desde: "2020-01-01", hasta: "2026-10-20" }, NOW).from).toBe("2025-10-20");
    const a = await setup("r7f");
    const b = await setup("r7g");
    expect(await code(buildReport(a.admin.actor, "asistencia", { ...RANGE, sede: b.site.id }, NOW))).toBe("NOT_FOUND");
    expect(await code(dashboard(a.admin.actor, { ...RANGE, empleado: b.employee.id }, NOW))).toBe("NOT_FOUND");
    const onlyA = await buildReport(a.admin.actor, "asistencia", RANGE, NOW);
    expect(new Set(onlyA.rows.map((r) => r.employee))).toEqual(new Set([`Ana r7f`]));
    const emp = await login(a.empUser.email);
    expect(await code(buildReport(emp.actor, "asistencia", RANGE, NOW))).toBe("FORBIDDEN");
  });
});
