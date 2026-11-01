import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { PARAMETER_INFO } from "@/lib/labor-parameter-info";
import { CONCEPT_LABEL, estimatePayroll, periodFor, periodFrequency, type NoveltyKind, type ParamRow, type SessionInput, type Warning } from "@/lib/payroll";
import { localDate, shiftsOn, zonedTimeToUtc } from "@/lib/schedule";
import { fieldErrors } from "@/lib/validation";
import type { ParameterUnit } from "@/generated/prisma/enums";
import { audit } from "@/server/audit";
import { requireCompanyAdmin, requireSuperadmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { loadOverrides, loadPatterns, shiftIsoDays } from "@/server/schedule-data";
import type { Actor } from "@/server/sessions";

/**
 * Pre-nómina ESTIMADA (fase 6). El cálculo vive en src/lib/payroll.ts (puro y
 * probado); aquí solo se cargan los datos de UNA empresa y se guarda el
 * resultado con la copia de parámetros usada y sus advertencias.
 */

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." });

// ───────────────────────────── Parámetros ─────────────────────────────

const toRow = (p: { key: string; value: unknown; unit: string; validFrom: Date; validTo: Date | null; legalSource: string; sourceUrl: string | null; verifiedAt: Date | null; companyId: string | null }): ParamRow => ({
  key: p.key, value: Number(p.value), unit: p.unit, validFrom: iso(p.validFrom), validTo: p.validTo ? iso(p.validTo) : null,
  legalSource: p.legalSource, sourceUrl: p.sourceUrl, verifiedAt: p.verifiedAt ? iso(p.verifiedAt) : null, companyId: p.companyId,
});

/** Tabla de parámetros: nacionales + los propios de la empresa (admin) o solo nacionales (superadmin). */
export async function listLaborParameters(actor: Actor) {
  const where = actor.role === "SUPERADMIN" ? { companyId: null } : { OR: [{ companyId: null }, { companyId: requireCompanyAdmin(actor) }] };
  const rows = await db.laborParameter.findMany({ where, orderBy: [{ key: "asc" }, { validFrom: "desc" }] });
  const order = Object.keys(PARAMETER_INFO);
  return rows
    .map((r) => ({ ...r, value: Number(r.value), label: PARAMETER_INFO[r.key]?.label ?? r.key, group: PARAMETER_INFO[r.key]?.group ?? "Otros" }))
    .sort((a, b) => (order.indexOf(a.key) + 1 || 999) - (order.indexOf(b.key) + 1 || 999) || b.validFrom.getTime() - a.validFrom.getTime());
}

/** El superadministrador (con la revisión de un contador) marca un valor como validado. */
export async function verifyLaborParameter(actor: Actor, id: string, now = new Date()) {
  requireSuperadmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("El parámetro");
  const p = await db.laborParameter.findFirst({ where: { id, companyId: null } });
  if (!p) throw notFound("El parámetro");
  const verifiedAt = day(localDate(now));
  await db.$transaction(async (tx) => {
    await tx.laborParameter.update({ where: { id }, data: { verifiedAt } });
    await audit({ companyId: null, actorUserId: actor.userId, action: "labor_parameter.verify", entityType: "labor_parameter", entityId: id, after: { key: p.key, value: Number(p.value), validFrom: iso(p.validFrom) } }, tx);
  });
}

export const parameterVersionSchema = z.object({
  key: z.enum(Object.keys(PARAMETER_INFO) as [string, ...string[]], { error: "Elige el parámetro." }),
  value: z.coerce.number({ error: "Escribe un número." }).min(0, { error: "No puede ser negativo." }).max(1e12),
  validFrom: isoDate,
  legalSource: z.string().trim().min(5, { error: "Escribe la norma (p. ej. Decreto 0159 de 2026)." }).max(300),
  sourceUrl: z.url({ error: "Escribe una URL válida (https://…)." }).max(500),
  notes: z.string().trim().max(500).optional(),
});

/**
 * Nueva versión de un parámetro nacional a partir de una fecha. La versión
 * vigente se cierra el día anterior; la historia nunca se borra.
 */
export async function addLaborParameterVersion(actor: Actor, input: unknown) {
  requireSuperadmin(actor);
  const parsed = parameterVersionSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const from = day(v.validFrom);
  return db.$transaction(async (tx) => {
    const versions = await tx.laborParameter.findMany({ where: { companyId: null, key: v.key }, orderBy: { validFrom: "asc" } });
    if (versions.some((r) => iso(r.validFrom) === v.validFrom)) throw new AppError("CONFLICT", "Ya hay una versión que empieza ese día.", { validFrom: "Ya existe una versión con esa fecha." });
    const later = versions.find((r) => r.validFrom > from);
    const previous = versions.filter((r) => r.validFrom < from).at(-1);
    const unit: ParameterUnit = (previous ?? later)?.unit ?? "PERCENT";
    if (previous && (previous.validTo == null || previous.validTo >= from)) {
      await tx.laborParameter.update({ where: { id: previous.id }, data: { validTo: new Date(from.getTime() - 86_400_000) } });
    }
    const created = await tx.laborParameter.create({
      data: {
        companyId: null, key: v.key, value: v.value, unit, validFrom: from,
        validTo: later ? new Date(later.validFrom.getTime() - 86_400_000) : null,
        legalSource: v.legalSource, sourceUrl: v.sourceUrl, notes: v.notes || null,
      },
    });
    await audit({ companyId: null, actorUserId: actor.userId, action: "labor_parameter.create", entityType: "labor_parameter", entityId: created.id, after: { key: v.key, value: v.value, validFrom: v.validFrom, legalSource: v.legalSource } }, tx);
    return created;
  });
}

// ───────────────────────────── Períodos ─────────────────────────────

export const periodSchema = z
  .object({ start: isoDate, end: isoDate })
  .refine((p) => periodFrequency(p.start, p.end) !== null, { error: "El período debe ser una quincena (1–15 o 16–fin de mes) o un mes completo." });

function parsePeriod(input: unknown) {
  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Período inválido.");
  return { ...parsed.data, frequency: periodFrequency(parsed.data.start, parsed.data.end)! };
}

/** Quincena anterior a la actual (la que normalmente se liquida). */
export function defaultPeriod(now = new Date(), tz = "America/Bogota") {
  const current = periodFor(localDate(now, tz), "QUINCENAL");
  return periodFor(shiftIsoDays(current.start, -1), "QUINCENAL");
}

/** Resumen de la pre-nómina de un período (si ya se calculó) + períodos calculados. */
export async function payrollOverview(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const p = parsePeriod(input);
  const [period, periods, company] = await Promise.all([
    db.payrollPeriod.findUnique({
      where: { companyId_startDate_endDate: { companyId, startDate: day(p.start), endDate: day(p.end) } },
      include: {
        estimates: {
          include: { employee: { select: { id: true, firstName: true, lastName: true, position: true } } },
          orderBy: { employee: { firstName: "asc" } },
        },
      },
    }),
    db.payrollPeriod.findMany({ where: { companyId }, orderBy: { startDate: "desc" }, take: 12, select: { id: true, startDate: true, endDate: true, _count: { select: { estimates: true } } } }),
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { parafiscalExempt: true } }),
  ]);
  const estimates = (period?.estimates ?? []).map((e) => {
    const warnings = e.warnings as Warning[];
    return {
      id: e.id, employee: e.employee, warnings, blocked: warnings.some((w) => w.severity === "block"),
      gross: Number(e.grossEstimate), deductions: Number(e.deductions), net: Number(e.netEstimate), employerCost: Number(e.employerCost), computedAt: e.computedAt,
    };
  });
  const ok = estimates.filter((e) => !e.blocked);
  const totals = {
    gross: ok.reduce((a, e) => a + e.gross, 0),
    deductions: ok.reduce((a, e) => a + e.deductions, 0),
    net: ok.reduce((a, e) => a + e.net, 0),
    employerCost: ok.reduce((a, e) => a + e.employerCost, 0),
  };
  return { ...p, period: period ? { id: period.id, status: period.status, createdAt: period.createdAt } : null, estimates, totals, blockedCount: estimates.length - ok.length, periods, parafiscalExempt: company.parafiscalExempt };
}

/** Calcula (o recalcula) la estimación de todos los empleados con contrato en el período. */
export async function computePayroll(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const p = parsePeriod(input);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true, parafiscalExempt: true } });
  const tz = company.timezone;
  const existing = await db.payrollPeriod.findUnique({ where: { companyId_startDate_endDate: { companyId, startDate: day(p.start), endDate: day(p.end) } } });
  if (existing && existing.status !== "DRAFT") throw new AppError("CONFLICT", "Este período ya fue revisado o cerrado y no se puede recalcular.");

  const rangeStart = zonedTimeToUtc(p.start, 0, tz);
  const rangeEnd = zonedTimeToUtc(shiftIsoDays(p.end, 1), 0, tz);
  const inPeriod = { gte: day(p.start), lte: day(p.end) };

  const [params, contracts, sessions, overtime, novelties] = await Promise.all([
    db.laborParameter.findMany({ where: { OR: [{ companyId: null }, { companyId }] } }),
    db.employeeContract.findMany({
      where: { companyId, startDate: { lte: day(p.end) }, OR: [{ endDate: null }, { endDate: { gte: day(p.start) } }] },
      orderBy: { startDate: "desc" },
    }),
    db.workSession.findMany({ where: { companyId, startAt: { gte: rangeStart, lt: rangeEnd } }, orderBy: { startAt: "asc" } }),
    db.overtimeRequest.findMany({ where: { companyId, workDate: inPeriod } }),
    db.novelty.findMany({ where: { companyId, status: { in: ["APPROVED", "PENDING"] }, startDate: { lte: day(p.end) }, endDate: { gte: day(p.start) } } }),
  ]);
  const paramRows = params.map(toRow);

  // Un contrato por empleado: el más reciente que cubre el período.
  const contractOf = new Map<string, (typeof contracts)[number]>();
  for (const c of contracts) if (!contractOf.has(c.employeeId)) contractOf.set(c.employeeId, c);
  const employeeIds = [...contractOf.keys()];

  const [patterns, overrides] = await Promise.all([loadPatterns(companyId, employeeIds), loadOverrides(companyId, p.start, p.end, employeeIds)]);

  const results = employeeIds.map((employeeId) => {
    const c = contractOf.get(employeeId)!;
    const mine = sessions.filter((s) => s.employeeId === employeeId);
    const closed = mine.filter((s) => s.status === "CLOSED" && s.endAt);
    const myOvertime = overtime.filter((o) => o.employeeId === employeeId);

    // Minutos extra por jornada: se ligan a su sesión o, si no tiene, a la última del día.
    const extra = new Map<string, { detected: number; approved: number }>();
    for (const o of myOvertime) {
      if (o.status === "CANCELLED") continue;
      const target = (o.workSessionId && closed.find((s) => s.id === o.workSessionId)) || closed.filter((s) => localDate(s.startAt, tz) === iso(o.workDate)).at(-1);
      if (!target) continue;
      const cur = extra.get(target.id) ?? { detected: 0, approved: 0 };
      cur.detected += o.detectedMinutes;
      if (o.status === "APPROVED") cur.approved += o.approvedMinutes ?? 0;
      extra.set(target.id, cur);
    }

    // Descanso no remunerado programado: se descuenta una vez por día, en la primera jornada.
    const breakTaken = new Set<string>();
    const sessionInputs: SessionInput[] = closed.map((s) => {
      const d = localDate(s.startAt, tz);
      let unpaidBreakMinutes = 0;
      if (!breakTaken.has(d)) {
        breakTaken.add(d);
        unpaidBreakMinutes = shiftsOn(patterns.get(employeeId) ?? [], d, tz, overrides.get(employeeId) ?? [])
          .filter((sh) => !sh.breakPaid)
          .reduce((a, sh) => a + sh.breakMinutes, 0);
      }
      const e = extra.get(s.id);
      return { startAt: s.startAt, endAt: s.endAt!, detectedExtraMinutes: e?.detected ?? 0, approvedExtraMinutes: e?.approved ?? 0, unpaidBreakMinutes };
    });

    const myNovelties = novelties.filter((n) => n.employeeId === employeeId);
    const result = estimatePayroll({
      period: { start: p.start, end: p.end },
      contract: {
        contractType: c.contractType, salaryType: c.salaryType, monthlySalary: Number(c.monthlySalary), weeklyHours: Number(c.weeklyHours),
        arlRiskClass: c.arlRiskClass, startDate: iso(c.startDate), endDate: c.endDate ? iso(c.endDate) : null,
      },
      sessions: sessionInputs,
      novelties: myNovelties.filter((n) => n.status === "APPROVED").map((n) => ({ type: n.type as NoveltyKind, startDate: iso(n.startDate), endDate: iso(n.endDate), hours: n.hours == null ? null : Number(n.hours) })),
      pending: {
        sessionsToReview: mine.filter((s) => s.status !== "CLOSED").length,
        overtimePending: myOvertime.filter((o) => o.status === "PENDING").length,
        noveltiesPending: myNovelties.filter((n) => n.status === "PENDING").length,
      },
      parafiscalExempt: company.parafiscalExempt,
      timeZone: tz,
      params: paramRows,
    });
    return { employeeId, result };
  });

  const period = await db.$transaction(async (tx) => {
    const period = existing ?? (await tx.payrollPeriod.create({ data: { companyId, startDate: day(p.start), endDate: day(p.end), frequency: p.frequency } }));
    await tx.payrollEstimate.deleteMany({ where: { periodId: period.id, companyId } });
    for (const { employeeId, result: r } of results) {
      await tx.payrollEstimate.create({
        data: {
          companyId, periodId: period.id, employeeId,
          grossEstimate: r.gross, deductions: r.deductions, netEstimate: r.net, employerCost: r.employerCost,
          parameterSnapshot: { parameters: r.snapshot, minutes: r.minutes, paidDays: r.paidDays, parafiscalExempt: company.parafiscalExempt },
          warnings: r.warnings,
          lines: { create: r.lines.map((l) => ({ concept: l.concept, kind: l.kind, quantity: l.quantity, rate: l.rate, amount: l.amount, basis: l.basis })) },
        },
      });
    }
    await audit({
      companyId, actorUserId: actor.userId, action: "payroll.compute", entityType: "payroll_period", entityId: period.id,
      after: { start: p.start, end: p.end, employees: results.length, blocked: results.filter((r) => r.result.blocked).length },
    }, tx);
    return period;
  });
  return { periodId: period.id, employees: results.length, blocked: results.filter((r) => r.result.blocked).length };
}

const KIND_ORDER = ["DEVENGADO", "DEDUCCION", "APORTE_EMPLEADOR", "PROVISION"];
const CONCEPT_ORDER = Object.keys(CONCEPT_LABEL);

/** Detalle de una estimación (líneas, advertencias y parámetros usados). */
export async function getPayrollEstimate(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La estimación");
  const e = await db.payrollEstimate.findFirst({
    where: { id, companyId },
    include: {
      lines: { orderBy: { id: "asc" } },
      employee: { select: { firstName: true, lastName: true, position: true, documentNumber: true } },
      period: { select: { startDate: true, endDate: true, frequency: true, status: true } },
    },
  });
  if (!e) throw notFound("La estimación");
  const snap = e.parameterSnapshot as { parameters: ParamRow[]; minutes: Record<string, unknown>; paidDays: number; parafiscalExempt: boolean };
  return {
    id: e.id, employee: e.employee, period: { ...e.period, start: iso(e.period.startDate), end: iso(e.period.endDate) },
    gross: Number(e.grossEstimate), deductions: Number(e.deductions), net: Number(e.netEstimate), employerCost: Number(e.employerCost),
    warnings: e.warnings as Warning[], computedAt: e.computedAt,
    lines: e.lines
      .map((l) => ({ ...l, label: CONCEPT_LABEL[l.concept] ?? l.concept, quantity: Number(l.quantity), rate: Number(l.rate), amount: Number(l.amount) }))
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || CONCEPT_ORDER.indexOf(a.concept) - CONCEPT_ORDER.indexOf(b.concept) || a.rate - b.rate),
    snapshot: snap,
  };
}
