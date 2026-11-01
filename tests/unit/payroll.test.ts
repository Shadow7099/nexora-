/**
 * Pre-nómina: casos calculados a mano (prueba obligatoria de la fase 6).
 * Salario 2.000.000, 42 h/sem → 210 h/mes → valor hora 9.523,8095.
 * Parámetros: los mismos de la migración (prisma/labor-parameters.ts).
 */
import { describe, expect, it } from "vitest";
import { LABOR_PARAMETERS } from "../../prisma/labor-parameters";
import { commercialDays, estimatePayroll, periodFor, periodFrequency, type EstimateInput, type ParamRow, type SessionInput } from "@/lib/payroll";

const PARAMS: ParamRow[] = LABOR_PARAMETERS.map((p) => ({ ...p, sourceUrl: p.sourceUrl, verifiedAt: null, companyId: null }));
const TZ = "America/Bogota";
// Hora local de Colombia (UTC−5) → instante.
const at = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00-05:00`);
const session = (day: string, from: string, toDay: string, to: string, over: Partial<SessionInput> = {}): SessionInput => ({
  startAt: at(day, from), endAt: at(toDay, to), detectedExtraMinutes: 0, approvedExtraMinutes: 0, unpaidBreakMinutes: 0, ...over,
});

const base = (over: Partial<EstimateInput> = {}): EstimateInput => ({
  period: { start: "2026-10-01", end: "2026-10-15" },
  contract: { contractType: "INDEFINIDO", salaryType: "ORDINARIO", monthlySalary: 2_000_000, weeklyHours: 42, arlRiskClass: "I", startDate: "2026-01-01", endDate: null },
  sessions: [],
  novelties: [],
  pending: { sessionsToReview: 0, overtimePending: 0, noveltiesPending: 0 },
  parafiscalExempt: false,
  timeZone: TZ,
  params: PARAMS,
  ...over,
});
const line = (r: ReturnType<typeof estimatePayroll>, concept: string) => r.lines.filter((l) => l.concept === concept);
const amount = (r: ReturnType<typeof estimatePayroll>, concept: string) => line(r, concept).reduce((a, l) => a + l.amount, 0);

describe("días comerciales y períodos", () => {
  it("cuenta meses de 30 días: el 31 no suma y febrero completo vale 30", () => {
    expect(commercialDays("2026-10-01", "2026-10-15")).toBe(15);
    expect(commercialDays("2026-10-16", "2026-10-31")).toBe(15);
    expect(commercialDays("2026-02-16", "2026-02-28")).toBe(15);
    expect(commercialDays("2026-10-01", "2026-10-31")).toBe(30);
    expect(commercialDays("2026-10-20", "2026-10-31")).toBe(11);
    expect(commercialDays("2026-10-10", "2026-10-09")).toBe(0);
  });

  it("reconoce quincenas y meses completos", () => {
    expect(periodFor("2026-10-20", "QUINCENAL")).toEqual({ start: "2026-10-16", end: "2026-10-31" });
    expect(periodFor("2026-02-03", "MENSUAL")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(periodFrequency("2026-10-16", "2026-10-31")).toBe("QUINCENAL");
    expect(periodFrequency("2026-10-01", "2026-10-31")).toBe("MENSUAL");
    expect(periodFrequency("2026-10-03", "2026-10-20")).toBeNull();
  });
});

describe("estimación de una quincena sin novedades", () => {
  it("salario, auxilio, deducciones, aportes y provisiones coinciden con el cálculo a mano", () => {
    const r = estimatePayroll(base());
    expect(r.blocked).toBe(false);
    expect(amount(r, "SALARIO_BASICO")).toBe(1_000_000); // 15 × 2.000.000/30
    expect(amount(r, "AUX_TRANSPORTE")).toBe(124_548); // 15 × 249.095/30 = 124.547,5
    expect(amount(r, "SALUD_EMPLEADO")).toBe(40_000); // 4 % de 1.000.000
    expect(amount(r, "PENSION_EMPLEADO")).toBe(40_000);
    expect(amount(r, "SALUD_EMPLEADOR")).toBe(85_000); // 8,5 %
    expect(amount(r, "PENSION_EMPLEADOR")).toBe(120_000); // 12 %
    expect(amount(r, "ARL")).toBe(5_220); // 0,522 %
    expect(amount(r, "CAJA_COMPENSACION")).toBe(40_000);
    expect(amount(r, "ICBF")).toBe(30_000);
    expect(amount(r, "SENA")).toBe(20_000);
    expect(amount(r, "CESANTIAS")).toBe(93_712); // 1.124.548 × 30/360
    expect(amount(r, "INT_CESANTIAS")).toBe(11_245); // 12 % de 93.712,33
    expect(amount(r, "PRIMA")).toBe(93_712);
    expect(amount(r, "VACACIONES")).toBe(41_667); // 1.000.000 × 15/360
    expect(r.gross).toBe(1_124_548);
    expect(r.deductions).toBe(80_000);
    expect(r.net).toBe(1_044_548);
    expect(r.employerCost).toBe(1_124_548 + 300_220 + 240_336);
    // Cada valor usado queda en la copia de parámetros, con su norma.
    expect(r.snapshot.find((p) => p.key === "SMMLV")).toMatchObject({ value: 1_750_905, legalSource: expect.stringContaining("0159") });
    expect(r.warnings.map((w) => w.code)).toContain("PARAMS_UNVERIFIED");
  });

  it("con exoneración del art. 114-1: salud del empleador, ICBF y SENA en cero", () => {
    const r = estimatePayroll(base({ parafiscalExempt: true }));
    expect([amount(r, "SALUD_EMPLEADOR"), amount(r, "ICBF"), amount(r, "SENA")]).toEqual([0, 0, 0]);
    expect(amount(r, "PENSION_EMPLEADOR")).toBe(120_000);
    expect(line(r, "SENA")[0]!.basis).toContain("114-1");
  });

  it("el auxilio de transporte se corta por encima de 2 SMMLV", () => {
    const r = estimatePayroll(base({ contract: { ...base().contract!, monthlySalary: 3_600_000 } }));
    expect(line(r, "AUX_TRANSPORTE")).toHaveLength(0);
    const justBelow = estimatePayroll(base({ contract: { ...base().contract!, monthlySalary: 3_501_810 } }));
    expect(line(justBelow, "AUX_TRANSPORTE")).toHaveLength(1);
  });
});

describe("recargos y horas extra", () => {
  it("jornada nocturna que cruza la medianoche entre semana: 8 h de recargo nocturno 35 %", () => {
    const r = estimatePayroll(base({ sessions: [session("2026-10-13", "22:00", "2026-10-14", "06:00")] }));
    expect(r.minutes.ordinaryNight).toBe(480);
    expect(amount(r, "RN")).toBe(26_667); // 8 × 9.523,81 × 0,35
  });

  it("domingo diurno con descanso no remunerado: 7 h al 90 % (vigente desde el 1 jul. 2026)", () => {
    const r = estimatePayroll(base({ period: { start: "2026-10-16", end: "2026-10-31" }, sessions: [session("2026-10-18", "08:00", "2026-10-18", "16:00", { unpaidBreakMinutes: 60 })] }));
    expect(r.minutes.ordinaryHolidayDay).toEqual({ "90": 420 });
    expect(amount(r, "RDF")).toBe(60_000); // 7 × 9.523,81 × 0,90
  });

  it("festivo (12 oct. 2026) que entra en la noche: recargo dominical y nocturno se suman", () => {
    const r = estimatePayroll(base({ sessions: [session("2026-10-12", "18:00", "2026-10-12", "22:00")] }));
    expect(amount(r, "RDF")).toBe(8_571); // 1 h × 9.523,81 × 0,90
    expect(amount(r, "RNDF")).toBe(35_714); // 3 h × 9.523,81 × (0,35 + 0,90)
  });

  it("noche de sábado a domingo: cambia de tipo a la medianoche", () => {
    const r = estimatePayroll(base({ period: { start: "2026-10-16", end: "2026-10-31" }, sessions: [session("2026-10-17", "22:00", "2026-10-18", "06:00")] }));
    expect(r.minutes.ordinaryNight).toBe(120);
    expect(r.minutes.ordinaryHolidayNight).toEqual({ "90": 360 });
    expect(amount(r, "RN")).toBe(6_667); // 2 × 9.523,81 × 0,35
    expect(amount(r, "RNDF")).toBe(71_429); // 6 × 9.523,81 × 1,25
  });

  it("horas extra aprobadas parcialmente: solo se paga lo aprobado; el resto queda registrado sin pago extra", () => {
    // 8:00–19:00, programado hasta 17:00: 120 min detectados, 60 aprobados.
    const r = estimatePayroll(base({ sessions: [session("2026-10-14", "08:00", "2026-10-14", "19:00", { detectedExtraMinutes: 120, approvedExtraMinutes: 60, unpaidBreakMinutes: 60 })] }));
    expect(r.minutes).toMatchObject({ ordinaryDay: 480, extraDay: 60, notApproved: 60, unpaidBreak: 60 });
    expect(amount(r, "HED")).toBe(11_905); // 1 × 9.523,81 × 1,25
    expect(line(r, "HEN")).toHaveLength(0);
  });

  it("horas extra nocturnas aprobadas y extra en festivo", () => {
    const r = estimatePayroll(base({ sessions: [
      session("2026-10-14", "10:00", "2026-10-14", "21:00", { detectedExtraMinutes: 120, approvedExtraMinutes: 120 }), // 19–21 h
      session("2026-10-12", "08:00", "2026-10-12", "18:00", { detectedExtraMinutes: 60, approvedExtraMinutes: 60 }), // festivo, 17–18 h
    ] }));
    expect(amount(r, "HEN")).toBe(33_333); // 2 × 9.523,81 × 1,75
    expect(amount(r, "HEDDF")).toBe(20_476); // 1 × 9.523,81 × (1 + 0,25 + 0,90)
  });

  it("horas extra rechazadas (0 aprobadas) no generan pago extra ni recargo", () => {
    const r = estimatePayroll(base({ sessions: [session("2026-10-14", "10:00", "2026-10-14", "21:00", { detectedExtraMinutes: 120, approvedExtraMinutes: 0 })] }));
    expect(r.minutes.notApproved).toBe(120);
    expect(line(r, "HEN")).toHaveLength(0);
    expect(line(r, "RN")).toHaveLength(0);
  });

  it("usa el recargo dominical vigente en cada fecha (80 % en junio, 90 % en julio de 2026)", () => {
    const r = estimatePayroll(base({
      period: { start: "2026-06-01", end: "2026-07-31" },
      sessions: [session("2026-06-28", "08:00", "2026-06-28", "10:00"), session("2026-07-05", "08:00", "2026-07-05", "10:00")],
    }));
    expect(line(r, "RDF").map((l) => [l.quantity, Math.round(l.rate)])).toEqual([[2, 7619], [2, 8571]]);
  });

  it("franja nocturna antes y después de la Ley 2466 (desde las 9 p. m. hasta el 24 dic. 2025)", () => {
    const params = { contract: { ...base().contract!, startDate: "2025-01-01" } };
    const before = estimatePayroll(base({ ...params, period: { start: "2025-12-16", end: "2025-12-31" }, sessions: [session("2025-12-23", "19:00", "2025-12-23", "21:00")] }));
    const after = estimatePayroll(base({ ...params, period: { start: "2025-12-16", end: "2025-12-31" }, sessions: [session("2025-12-26", "19:00", "2025-12-26", "21:00")] }));
    expect(before.minutes.ordinaryNight).toBe(0);
    expect(after.minutes.ordinaryNight).toBe(120);
    expect(before.snapshot.find((p) => p.key === "SMMLV")!.value).toBe(1_423_500);
  });
});

describe("novedades y advertencias", () => {
  it("licencia no remunerada descuenta días; vacaciones quitan el auxilio pero no el salario", () => {
    const r = estimatePayroll(base({ novelties: [
      { type: "LICENCIA_NO_REMUNERADA", startDate: "2026-10-01", endDate: "2026-10-03", hours: null },
      { type: "VACACIONES", startDate: "2026-10-05", endDate: "2026-10-06", hours: null },
    ] }));
    expect(line(r, "SALARIO_BASICO")[0]!.quantity).toBe(12);
    expect(line(r, "AUX_TRANSPORTE")[0]!.quantity).toBe(10);
  });

  it("incapacidad, jornadas por revisar y extras pendientes generan advertencias", () => {
    const r = estimatePayroll(base({
      novelties: [{ type: "INCAPACIDAD_COMUN", startDate: "2026-10-07", endDate: "2026-10-08", hours: null }],
      pending: { sessionsToReview: 1, overtimePending: 2, noveltiesPending: 0 },
    }));
    expect(r.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["INCAPACITY", "SESSIONS_REVIEW", "OVERTIME_PENDING"]));
    expect(r.blocked).toBe(false);
  });

  it("salario por debajo del mínimo y fondo de solidaridad se advierten", () => {
    const low = estimatePayroll(base({ contract: { ...base().contract!, monthlySalary: 1_500_000 } }));
    expect(low.warnings.map((w) => w.code)).toContain("BELOW_MINIMUM");
    // El IBC se lleva al mínimo: 1 SMMLV × 15/30.
    expect(amount(low, "SALUD_EMPLEADO")).toBe(Math.round((1_750_905 / 2) * 0.04));
    const high = estimatePayroll(base({ contract: { ...base().contract!, monthlySalary: 8_000_000 } }));
    expect(high.warnings.map((w) => w.code)).toContain("SOLIDARITY_FUND");
  });

  it("parámetro faltante ⇒ bloqueado, con advertencia y SIN números", () => {
    const params = PARAMS.filter((p) => !(p.key === "RECARGO_DOMINICAL_FESTIVO" && p.value === 90));
    const r = estimatePayroll(base({ params, period: { start: "2026-10-16", end: "2026-10-31" }, sessions: [session("2026-10-18", "08:00", "2026-10-18", "12:00")] }));
    expect(r.blocked).toBe(true);
    expect(r.lines).toEqual([]);
    expect([r.gross, r.net, r.employerCost]).toEqual([0, 0, 0]);
    expect(r.warnings[0]).toMatchObject({ code: "MISSING_PARAMETER", severity: "block", message: expect.stringContaining("RECARGO_DOMINICAL_FESTIVO (18/10/2026)") });

    const noSmmlv = estimatePayroll(base({ params: PARAMS.filter((p) => p.key !== "SMMLV") }));
    expect(noSmmlv.blocked).toBe(true);
    expect(noSmmlv.warnings[0]!.message).toContain("SMMLV");
  });

  it("un valor de la empresa tiene prioridad sobre el nacional (p. ej. tarifa ARL de su póliza)", () => {
    const params = [...PARAMS, { key: "ARL_CLASE_I", value: 0.348, unit: "PERCENT", validFrom: "2026-01-01", validTo: null, legalSource: "Póliza ARL", sourceUrl: null, verifiedAt: "2026-10-01", companyId: "c1" }];
    expect(amount(estimatePayroll(base({ params })), "ARL")).toBe(3_480);
  });

  it("contratos que no se estiman quedan bloqueados con su motivo", () => {
    const c = base().contract!;
    expect(estimatePayroll(base({ contract: null })).warnings[0]!.code).toBe("NO_CONTRACT");
    expect(estimatePayroll(base({ contract: { ...c, salaryType: "INTEGRAL" } })).warnings[0]!.code).toBe("INTEGRAL");
    expect(estimatePayroll(base({ contract: { ...c, contractType: "APRENDIZAJE" } })).warnings[0]!.code).toBe("APPRENTICE");
    expect(estimatePayroll(base({ contract: { ...c, contractType: "PRESTACION_SERVICIOS" } })).warnings[0]!.code).toBe("NOT_EMPLOYMENT");
    // Contrato que empieza a mitad de quincena: días proporcionales.
    const mid = estimatePayroll(base({ contract: { ...c, startDate: "2026-10-11" } }));
    expect(line(mid, "SALARIO_BASICO")[0]!.quantity).toBe(5);
  });
});
