import "server-only";
import { db } from "@/lib/db";
import type { OverrideInput, PatternInput } from "@/lib/schedule";

/** Patrones de turnos de los empleados indicados (de una sola empresa), listos para resolver fechas. */
export async function loadPatterns(companyId: string, employeeIds?: string[]) {
  const rows = await db.schedulePattern.findMany({
    where: { companyId, ...(employeeIds ? { employeeId: { in: employeeIds } } : {}) },
    include: {
      days: {
        include: {
          template: { select: { name: true, startMin: true, endMin: true, breakMinutes: true, breakPaid: true } },
          site: { select: { id: true, name: true } },
        },
      },
    },
  });
  const byEmployee = new Map<string, PatternInput[]>();
  for (const r of rows) {
    const list = byEmployee.get(r.employeeId) ?? [];
    list.push({
      cycleDays: r.cycleDays,
      anchorDate: r.anchorDate,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      days: r.days.map((d) => ({ dayIndex: d.dayIndex, siteId: d.site.id, siteName: d.site.name, template: d.template })),
    });
    byEmployee.set(r.employeeId, list);
  }
  return byEmployee;
}

/** Cambios puntuales (scheduled_shift) entre dos fechas locales, agrupados por empleado. */
export async function loadOverrides(companyId: string, from: string, to: string, employeeIds?: string[]) {
  const rows = await db.scheduledShift.findMany({
    where: {
      companyId,
      workDate: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) },
      ...(employeeIds ? { employeeId: { in: employeeIds } } : {}),
    },
    include: { site: { select: { id: true, name: true } }, template: { select: { name: true } } },
  });
  const map = new Map<string, OverrideInput[]>();
  for (const r of rows) {
    const list = map.get(r.employeeId) ?? [];
    list.push({
      workDate: r.workDate.toISOString().slice(0, 10),
      status: r.status,
      start: r.startAt,
      end: r.endAt,
      breakMinutes: r.breakMinutes,
      breakPaid: r.breakPaid,
      siteId: r.site.id,
      siteName: r.site.name,
      templateName: r.template?.name ?? (r.status === "CANCELLED" ? "Descanso" : "Turno especial"),
    });
    map.set(r.employeeId, list);
  }
  return map;
}

const DAY_MS = 86_400_000;
export const shiftIsoDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
