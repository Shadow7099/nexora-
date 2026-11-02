import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { dailyAttendance, daysBetween, hoursBySite, monthlyPunctuality, previousRange, summarize, weeklySeries, dayStatusLabel, type DayRow } from "@/lib/reports";
import { formatDateTime, REPORTS, toHours, type ReportKey, type ReportTable } from "@/lib/report-table";
import { localDate, zonedTimeToUtc } from "@/lib/schedule";
import { reasonLabel } from "@/server/attendance";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { noveltyLabel } from "@/server/novelties";
import { loadOverrides, loadPatterns, shiftIsoDays } from "@/server/schedule-data";
import type { Actor } from "@/server/sessions";

/**
 * Tablero y reportes (fase 7). Todo se calcula desde las tablas reales de UNA
 * empresa (la del actor). Los filtros de sede y empleado se validan contra esa
 * empresa: un id de otra empresa responde NOT_FOUND.
 */

export const MAX_RANGE_DAYS = 366;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type ReportFilters = { from: string; to: string; siteId: string | null; employeeId: string | null };

/** Filtros de la URL (?desde=&hasta=&sede=&empleado=). Valores inválidos vuelven al valor por defecto: últimos 30 días. */
export function parseFilters(input: Record<string, unknown>, now = new Date(), tz = "America/Bogota"): ReportFilters {
  const today = localDate(now, tz);
  const str = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : undefined);
  let from = isoDate.safeParse(str(input.desde)).data ?? shiftIsoDays(today, -29);
  let to = isoDate.safeParse(str(input.hasta)).data ?? today;
  if (Number.isNaN(Date.parse(from))) from = shiftIsoDays(today, -29);
  if (Number.isNaN(Date.parse(to))) to = today;
  if (to < from) [from, to] = [to, from];
  if (daysBetween(from, to).length > MAX_RANGE_DAYS) from = shiftIsoDays(to, -(MAX_RANGE_DAYS - 1));
  const uuid = (v: unknown) => z.uuid().safeParse(str(v)).data ?? null;
  return { from, to, siteId: uuid(input.sede), employeeId: uuid(input.empleado) };
}

/** Empresa, sedes y empleados (para filtros y nombres); valida que los filtros sean de esta empresa. */
async function scope(companyId: string, f: ReportFilters) {
  const [company, sites, employees] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, legalName: true, nit: true, timezone: true, lateToleranceMin: true } }),
    db.site.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.employee.findMany({
      where: { companyId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, documentNumber: true, status: true, userId: true, defaultSiteId: true, defaultSite: { select: { name: true } } },
    }),
  ]);
  if (f.siteId && !sites.some((s) => s.id === f.siteId)) throw notFound("La sede");
  if (f.employeeId && !employees.some((e) => e.id === f.employeeId)) throw notFound("El empleado");
  const filters: string[] = [];
  if (f.siteId) filters.push(`Sede: ${sites.find((s) => s.id === f.siteId)!.name}`);
  if (f.employeeId) {
    const e = employees.find((x) => x.id === f.employeeId)!;
    filters.push(`Empleado: ${e.firstName} ${e.lastName}`);
  }
  return { company, sites, employees, filters };
}

type Scope = Awaited<ReturnType<typeof scope>>;
const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;

/** Empleados incluidos: el filtrado, o los activos más los que tuvieron jornadas en el rango. */
async function attendanceRows(companyId: string, s: Scope, f: ReportFilters, now: Date): Promise<DayRow[]> {
  const tz = s.company.timezone;
  const rangeStart = zonedTimeToUtc(f.from, 0, tz);
  const rangeEnd = zonedTimeToUtc(shiftIsoDays(f.to, 1), 0, tz);
  const sessions = await db.workSession.findMany({
    where: { companyId, startAt: { gte: rangeStart, lt: rangeEnd }, ...(f.employeeId ? { employeeId: f.employeeId } : {}) },
    select: { employeeId: true, siteId: true, startAt: true, endAt: true, status: true, site: { select: { name: true } } },
  });
  const withSessions = new Set(sessions.map((x) => x.employeeId));
  const employees = s.employees.filter((e) => (f.employeeId ? e.id === f.employeeId : e.status === "ACTIVE" || withSessions.has(e.id)));
  const ids = employees.map((e) => e.id);
  const [patterns, overrides, novelties] = await Promise.all([
    loadPatterns(companyId, ids),
    loadOverrides(companyId, f.from, f.to, ids),
    db.novelty.findMany({ where: { companyId, status: "APPROVED", employeeId: { in: ids }, startDate: { lte: day(f.to) }, endDate: { gte: day(f.from) } } }),
  ]);
  const rows = dailyAttendance({
    from: f.from,
    to: f.to,
    timeZone: tz,
    now,
    toleranceMin: s.company.lateToleranceMin,
    employees: employees.map((e) => ({ id: e.id, name: fullName(e), document: e.documentNumber, defaultSiteId: e.defaultSiteId, defaultSiteName: e.defaultSite?.name ?? null })),
    patterns,
    overrides,
    sessions: sessions.map((x) => ({ employeeId: x.employeeId, siteId: x.siteId, siteName: x.site.name, startAt: x.startAt, endAt: x.endAt, status: x.status })),
    novelties: novelties.map((n) => ({ employeeId: n.employeeId, label: noveltyLabel[n.type], startDate: iso(n.startDate), endDate: iso(n.endDate), hours: n.hours == null ? null : Number(n.hours) })),
  });
  return f.siteId ? rows.filter((r) => r.siteId === f.siteId) : rows;
}

/** Empleados que entran en los reportes por filtros de sede/empleado (para extras, novedades, pre-nómina). */
function employeeFilter(s: Scope, f: ReportFilters) {
  if (f.employeeId) return [f.employeeId];
  if (f.siteId) return s.employees.filter((e) => e.defaultSiteId === f.siteId).map((e) => e.id);
  return null;
}

// ───────────────────────────── Tablero ─────────────────────────────

export async function dashboard(actor: Actor, input: Record<string, unknown>, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const tz = (await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } })).timezone;
  const f = parseFilters(input, now, tz);
  const s = await scope(companyId, f);
  const prev = { ...f, ...previousRange(f.from, f.to) };
  const empIds = employeeFilter(s, f);
  const [rows, prevRows, overtime, estimates, activeSites] = await Promise.all([
    attendanceRows(companyId, s, f, now),
    attendanceRows(companyId, s, prev, now),
    db.overtimeRequest.findMany({
      where: { companyId, workDate: { gte: day(prev.from), lte: day(f.to) }, status: "APPROVED", ...(empIds ? { employeeId: { in: empIds } } : {}) },
      select: { workDate: true, approvedMinutes: true },
    }),
    db.payrollEstimate.findMany({
      where: { companyId, ...(empIds ? { employeeId: { in: empIds } } : {}) },
      select: { employerCost: true, warnings: true, period: { select: { startDate: true, endDate: true } } },
    }),
    db.site.count({ where: { companyId, active: true } }),
  ]);
  const sumOvertime = (a: string, b: string) => overtime.filter((o) => iso(o.workDate) >= a && iso(o.workDate) <= b).reduce((acc, o) => acc + (o.approvedMinutes ?? 0), 0);

  // Costo estimado: suma de las estimaciones calculadas (sin bloqueos), agrupadas por período.
  const periods = new Map<string, { start: string; end: string; cost: number }>();
  for (const e of estimates) {
    if ((e.warnings as { severity: string }[]).some((w) => w.severity === "block")) continue;
    const start = iso(e.period.startDate);
    const end = iso(e.period.endDate);
    const p = periods.get(`${start}_${end}`) ?? { start, end, cost: 0 };
    p.cost += Number(e.employerCost);
    periods.set(`${start}_${end}`, p);
  }
  const costSeries = [...periods.values()].sort((a, b) => a.start.localeCompare(b.start)).slice(-12);
  const inRange = costSeries.filter((p) => p.start >= f.from && p.end <= f.to);

  return {
    filters: f,
    prevRange: { from: prev.from, to: prev.to },
    sites: s.sites,
    employees: s.employees.map((e) => ({ id: e.id, name: fullName(e), active: e.status === "ACTIVE" })),
    summary: summarize(rows),
    prevSummary: summarize(prevRows),
    overtimeMinutes: sumOvertime(f.from, f.to),
    prevOvertimeMinutes: sumOvertime(prev.from, prev.to),
    activeSites,
    cost: inRange.length ? { total: inRange.reduce((a, p) => a + p.cost, 0), periods: inRange.length } : null,
    weekly: weeklySeries(rows),
    punctuality: monthlyPunctuality(rows),
    bySite: hoursBySite(rows),
    costSeries,
  };
}

// ───────────────────────────── Reportes ─────────────────────────────

export async function buildReport(actor: Actor, key: ReportKey, input: Record<string, unknown>, now = new Date()): Promise<ReportTable> {
  const companyId = requireCompanyAdmin(actor);
  const tz = (await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } })).timezone;
  const f = parseFilters(input, now, tz);
  const s = await scope(companyId, f);
  const meta = { companyName: s.company.legalName ?? s.company.name, nit: s.company.nit, from: f.from, to: f.to, generatedAt: now, timeZone: tz, filters: s.filters };
  const base = { key, title: REPORTS[key].title, description: REPORTS[key].description, meta };
  const dt = (d: Date | null) => (d ? formatDateTime(d, tz) : null);
  const empIds = employeeFilter(s, f);
  const names = new Map(s.employees.map((e) => [e.id, fullName(e)]));

  switch (key) {
    case "asistencia": {
      const rows = (await attendanceRows(companyId, s, f, now)).filter((r) => r.status !== "rest" || r.workedMinutes > 0);
      const sum = summarize(rows);
      return {
        ...base,
        columns: [
          { key: "date", label: "Fecha", kind: "date" },
          { key: "employee", label: "Empleado", kind: "text" },
          { key: "document", label: "Documento", kind: "text" },
          { key: "site", label: "Sede", kind: "text" },
          { key: "scheduled", label: "Horas programadas", kind: "hours" },
          { key: "worked", label: "Horas trabajadas", kind: "hours" },
          { key: "in", label: "Entrada", kind: "datetime" },
          { key: "out", label: "Salida", kind: "datetime" },
          { key: "late", label: "Minutos tarde", kind: "int" },
          { key: "status", label: "Estado", kind: "text" },
          { key: "novelty", label: "Novedad", kind: "text" },
          { key: "holiday", label: "Festivo", kind: "text" },
        ],
        rows: rows
          .sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName))
          .map((r) => ({
            date: r.date, employee: r.employeeName, document: r.document, site: r.siteName, scheduled: toHours(r.scheduledMinutes), worked: toHours(r.workedMinutes),
            in: dt(r.firstIn), out: dt(r.lastOut), late: r.lateMinutes, status: dayStatusLabel[r.status], novelty: r.novelty, holiday: r.holiday,
          })),
        totals: { scheduled: toHours(sum.scheduledMinutes), worked: toHours(sum.workedMinutes), late: rows.reduce((a, r) => a + r.lateMinutes, 0) },
        notes: [
          `Días programados: ${sum.scheduledDays} · asistidos: ${sum.attendedDays} · ausencias: ${sum.absences} · tardanzas: ${sum.lates} · por revisar: ${sum.toReview}.`,
          "Solo suman horas las jornadas cerradas. Una jornada pertenece al día de su entrada.",
        ],
      };
    }

    case "horas-extra": {
      const list = await db.overtimeRequest.findMany({
        where: { companyId, workDate: { gte: day(f.from), lte: day(f.to) }, status: { not: "CANCELLED" }, ...(empIds ? { employeeId: { in: empIds } } : {}) },
        orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
        include: { decidedBy: { select: { name: true } } },
      });
      const treatment = { PENDING: "Pendiente: no se paga como extra hasta decidir", APPROVED: "Se paga como extra (lo aprobado)", REJECTED: "No se paga como extra; el tiempo sigue registrado" } as const;
      const status = { PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada" } as const;
      const rows = list.map((o) => {
        const st = o.status as keyof typeof status;
        return {
          date: iso(o.workDate), employee: names.get(o.employeeId) ?? "—", detected: o.detectedMinutes, approved: o.status === "APPROVED" ? (o.approvedMinutes ?? 0) : 0,
          status: status[st], treatment: treatment[st], decidedBy: o.decidedBy?.name ?? null, decidedAt: dt(o.decidedAt), note: o.decisionNote ?? o.employeeNote,
        };
      });
      return {
        ...base,
        columns: [
          { key: "date", label: "Fecha", kind: "date" },
          { key: "employee", label: "Empleado", kind: "text" },
          { key: "detected", label: "Minutos registrados de más", kind: "int" },
          { key: "approved", label: "Minutos autorizados", kind: "int" },
          { key: "status", label: "Estado", kind: "text" },
          { key: "treatment", label: "Tratamiento en pre-nómina", kind: "text" },
          { key: "decidedBy", label: "Decidió", kind: "text" },
          { key: "decidedAt", label: "Fecha de decisión", kind: "datetime" },
          { key: "note", label: "Nota", kind: "text" },
        ],
        rows,
        totals: { detected: rows.reduce((a, r) => a + r.detected, 0), approved: rows.reduce((a, r) => a + r.approved, 0) },
        notes: ["Rechazar o aprobar parcialmente no cambia el tiempo registrado: solo define cuánto se paga como extra."],
      };
    }

    case "novedades": {
      const list = await db.novelty.findMany({
        where: { companyId, startDate: { lte: day(f.to) }, endDate: { gte: day(f.from) }, ...(empIds ? { employeeId: { in: empIds } } : {}) },
        orderBy: [{ startDate: "asc" }],
        include: { decidedBy: { select: { name: true } } },
      });
      const status = { PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada" } as const;
      const rows = list.map((n) => {
        const a = iso(n.startDate) > f.from ? iso(n.startDate) : f.from;
        const b = iso(n.endDate) < f.to ? iso(n.endDate) : f.to;
        return {
          employee: names.get(n.employeeId) ?? "—", type: noveltyLabel[n.type], from: iso(n.startDate), to: iso(n.endDate),
          daysInRange: n.hours ? 0 : daysBetween(a, b).length, hours: n.hours == null ? null : Number(n.hours), status: status[n.status], decidedBy: n.decidedBy?.name ?? null, note: n.note,
        };
      });
      return {
        ...base,
        columns: [
          { key: "employee", label: "Empleado", kind: "text" },
          { key: "type", label: "Tipo", kind: "text" },
          { key: "from", label: "Desde", kind: "date" },
          { key: "to", label: "Hasta", kind: "date" },
          { key: "daysInRange", label: "Días en el período", kind: "int" },
          { key: "hours", label: "Horas (permiso)", kind: "hours" },
          { key: "status", label: "Estado", kind: "text" },
          { key: "decidedBy", label: "Decidió", kind: "text" },
          { key: "note", label: "Nota", kind: "text" },
        ],
        rows,
        totals: { daysInRange: rows.reduce((a, r) => a + r.daysInRange, 0) },
        notes: ["Días calendario dentro del período consultado; los permisos por horas cuentan 0 días."],
      };
    }

    case "pre-nomina": {
      const list = await db.payrollEstimate.findMany({
        where: { companyId, period: { startDate: { lte: day(f.to) }, endDate: { gte: day(f.from) } }, ...(empIds ? { employeeId: { in: empIds } } : {}) },
        include: { period: { select: { startDate: true, endDate: true } } },
        orderBy: [{ period: { startDate: "asc" } }],
      });
      const rows = list
        .map((e) => {
          const warnings = e.warnings as { severity: string; message: string }[];
          const blocked = warnings.some((w) => w.severity === "block");
          return {
            period: `${iso(e.period.startDate)} a ${iso(e.period.endDate)}`, employee: names.get(e.employeeId) ?? "—",
            gross: blocked ? null : Number(e.grossEstimate), deductions: blocked ? null : Number(e.deductions), net: blocked ? null : Number(e.netEstimate),
            employerCost: blocked ? null : Number(e.employerCost), state: blocked ? "Sin calcular (faltan datos)" : "Estimado",
            warnings: warnings.filter((w) => w.severity !== "info").map((w) => w.message).join(" | ") || null, computedAt: dt(e.computedAt),
          };
        })
        .sort((a, b) => a.period.localeCompare(b.period) || a.employee.localeCompare(b.employee));
      const sum = (k: "gross" | "deductions" | "net" | "employerCost") => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
      return {
        ...base,
        columns: [
          { key: "period", label: "Período", kind: "text" },
          { key: "employee", label: "Empleado", kind: "text" },
          { key: "gross", label: "Devengado", kind: "money" },
          { key: "deductions", label: "Deducciones", kind: "money" },
          { key: "net", label: "Neto estimado", kind: "money" },
          { key: "employerCost", label: "Costo empresa", kind: "money" },
          { key: "state", label: "Estado", kind: "text" },
          { key: "warnings", label: "Advertencias", kind: "text" },
          { key: "computedAt", label: "Calculado", kind: "datetime" },
        ],
        rows,
        totals: { gross: sum("gross"), deductions: sum("deductions"), net: sum("net"), employerCost: sum("employerCost") },
        notes: [
          "Estimación, no liquidación legal. Incluye los períodos de pre-nómina calculados que se cruzan con las fechas elegidas.",
          "Los empleados sin calcular no suman en los totales.",
        ],
      };
    }

    case "intentos": {
      const userIds = empIds ? s.employees.filter((e) => empIds.includes(e.id)).map((e) => e.userId).filter((u): u is string => !!u) : null;
      const list = await db.attendanceAttempt.findMany({
        where: {
          companyId,
          occurredAt: { gte: zonedTimeToUtc(f.from, 0, tz), lt: zonedTimeToUtc(shiftIsoDays(f.to, 1), 0, tz) },
          ...(userIds ? { userId: { in: userIds } } : {}),
          ...(f.siteId && !f.employeeId ? { siteId: f.siteId } : {}),
        },
        orderBy: { occurredAt: "asc" },
      });
      const byUser = new Map(s.employees.filter((e) => e.userId).map((e) => [e.userId!, fullName(e)]));
      const siteName = new Map(s.sites.map((x) => [x.id, x.name]));
      const rows = list.map((a) => {
        const d = (a.detail ?? {}) as { distance?: number | null; accuracy?: number | null };
        return {
          at: dt(a.occurredAt), employee: a.userId ? (byUser.get(a.userId) ?? "—") : "—", site: a.siteId ? (siteName.get(a.siteId) ?? "—") : "—",
          reason: reasonLabel[a.reason], distance: typeof d.distance === "number" ? Math.round(d.distance) : null, accuracy: typeof d.accuracy === "number" ? Math.round(d.accuracy) : null,
        };
      });
      return {
        ...base,
        columns: [
          { key: "at", label: "Fecha y hora", kind: "datetime" },
          { key: "employee", label: "Empleado", kind: "text" },
          { key: "site", label: "Sede", kind: "text" },
          { key: "reason", label: "Motivo", kind: "text" },
          { key: "distance", label: "Distancia a la sede (m)", kind: "int" },
          { key: "accuracy", label: "Precisión GPS (m)", kind: "int" },
        ],
        rows,
        totals: {},
        notes: [`${rows.length} intento(s) rechazado(s). Ningún intento rechazado crea una marcación.`],
      };
    }
  }
}

export function assertReportKey(key: string): asserts key is ReportKey {
  if (!(key in REPORTS)) throw new AppError("NOT_FOUND", "Ese reporte no existe.");
}
