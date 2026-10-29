import "server-only";
import { db } from "@/lib/db";
import type { PatternInput } from "@/lib/schedule";

/** Patrones de turnos de los empleados indicados (de una sola empresa), listos para resolver fechas. */
export async function loadPatterns(companyId: string, employeeIds?: string[]) {
  const rows = await db.schedulePattern.findMany({
    where: { companyId, ...(employeeIds ? { employeeId: { in: employeeIds } } : {}) },
    include: {
      days: {
        include: {
          template: { select: { name: true, startMin: true, endMin: true, breakMinutes: true } },
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
