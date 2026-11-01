import "server-only";
import { db } from "@/lib/db";
import { holidaysBetween } from "@/lib/holidays";
import { localDate, shiftsOn } from "@/lib/schedule";
import { requireCompanyAdmin, requireEmployee } from "@/server/authz";
import { loadOverrides, loadPatterns } from "@/server/schedule-data";
import type { Actor } from "@/server/sessions";

/** Sedes con su QR vigente y horario de apertura. */
export async function listSites(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.site.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
      active: true,
      openingHours: { orderBy: { weekday: "asc" }, select: { weekday: true, opensMin: true, closesMin: true } },
      qrCodes: { where: { revokedAt: null }, select: { publicCode: true, version: true, createdAt: true } },
      _count: { select: { employeesDefault: { where: { status: "ACTIVE" } } } },
    },
  });
}

const DAY_MS = 86_400_000;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** Lunes (AAAA-MM-DD) de la semana que contiene la fecha dada. */
export function mondayOf(iso: string) {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(iso, -((dow + 6) % 7));
}

/** Turnos de la semana para todos los empleados activos, resueltos desde sus patrones. */
export async function weekSchedule(actor: Actor, weekOffset = 0, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const tz = company.timezone;
  const today = localDate(now, tz);
  const monday = addDays(mondayOf(today), Math.max(-52, Math.min(52, Math.trunc(weekOffset))) * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const employees = await db.employee.findMany({
    where: { companyId, status: "ACTIVE" },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true, position: true },
  });
  const [patterns, overrides] = await Promise.all([loadPatterns(companyId), loadOverrides(companyId, days[0]!, days[6]!)]);
  const templates = await db.shiftTemplate.findMany({ where: { companyId, active: true }, orderBy: { startMin: "asc" } });
  return {
    tz,
    today,
    days,
    holidays: new Map(holidaysBetween(days[0]!, days[6]!).map((h) => [h.date, h.name])),
    templates,
    rows: employees.map((e) => {
      const p = patterns.get(e.id) ?? [];
      const perDay = days.map((d) => shiftsOn(p, d, tz, overrides.get(e.id) ?? []));
      const minutes = perDay.flat().reduce((acc, s) => acc + (s.endMin - s.startMin - s.breakMinutes), 0);
      return { ...e, perDay, plannedMinutes: minutes };
    }),
  };
}

/** Contrato vigente de cada empleado y estado de los parámetros legales. */
export async function payrollPreview(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const [employees, parameters] = await Promise.all([
    db.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        contracts: {
          where: { startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
          orderBy: { startDate: "desc" },
          take: 1,
          select: { contractType: true, monthlySalary: true, weeklyHours: true, payFrequency: true, arlRiskClass: true },
        },
      },
    }),
    db.laborParameter.count({ where: { OR: [{ companyId: null }, { companyId }] } }),
  ]);
  return { employees, parametersLoaded: parameters };
}

export async function attendanceSummary(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const [events, openSessions, attempts, pendingDevices] = await Promise.all([
    db.attendanceEvent.count({ where: { companyId } }),
    db.workSession.count({ where: { companyId, status: "OPEN" } }),
    db.attendanceAttempt.count({ where: { companyId } }),
    db.deviceBinding.count({ where: { companyId, status: "PENDING" } }),
  ]);
  return { events, openSessions, attempts, pendingDevices };
}

export async function requestsSummary(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const [overtime, novelties] = await Promise.all([
    db.overtimeRequest.count({ where: { companyId, status: "PENDING" } }),
    db.novelty.count({ where: { companyId, status: "PENDING" } }),
  ]);
  return { overtime, novelties };
}

/** Datos propios del empleado: jornadas y solicitudes (nunca de otros). */
export async function employeeActivity(actor: Actor) {
  const { companyId, employeeId } = requireEmployee(actor);
  const [sessions, overtime, novelties] = await Promise.all([
    db.workSession.findMany({ where: { companyId, employeeId }, orderBy: { startAt: "desc" }, take: 30 }),
    db.overtimeRequest.count({ where: { companyId, employeeId } }),
    db.novelty.count({ where: { companyId, employeeId } }),
  ]);
  return { sessions, overtime, novelties };
}
