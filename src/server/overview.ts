import "server-only";
import { db } from "@/lib/db";
import { currentOrNextShift, localDate, shiftsOn } from "@/lib/schedule";
import { requireCompanyAdmin, requireEmployee } from "@/server/authz";
import { loadOverrides, loadPatterns, shiftIsoDays } from "@/server/schedule-data";
import type { Actor } from "@/server/sessions";

/** Resumen del administrador con datos reales de su empresa. */
export async function adminOverview(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const [employees, activeSites, qrActive, pendingDevices] = await Promise.all([
    db.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, position: true, defaultSite: { select: { name: true } } },
    }),
    db.site.count({ where: { companyId, active: true } }),
    db.siteQrCode.count({ where: { companyId, revokedAt: null, site: { active: true } } }),
    db.deviceBinding.count({ where: { companyId, status: "PENDING" } }),
  ]);
  const today = localDate(now, company.timezone);
  const [patterns, overrides] = await Promise.all([loadPatterns(companyId), loadOverrides(companyId, today, today)]);
  const roster = employees.map((e) => ({
    ...e,
    shifts: shiftsOn(patterns.get(e.id) ?? [], today, company.timezone, overrides.get(e.id) ?? []),
  }));
  return {
    today,
    timezone: company.timezone,
    activeEmployees: employees.length,
    activeSites,
    qrActive,
    pendingDevices,
    scheduledToday: roster.filter((r) => r.shifts.length > 0).length,
    roster,
  };
}

/** Pantalla principal del empleado: solo sus propios datos. */
export async function employeeHome(actor: Actor, now = new Date()) {
  const { companyId, employeeId } = requireEmployee(actor);
  const employee = await db.employee.findFirstOrThrow({
    where: { id: employeeId, companyId },
    select: { firstName: true, defaultSite: { select: { name: true } }, company: { select: { timezone: true, requireDeviceBinding: true } } },
  });
  const tz = employee.company.timezone;
  const today = localDate(now, tz);
  const patterns = (await loadPatterns(companyId, [employeeId])).get(employeeId) ?? [];
  const ov = (await loadOverrides(companyId, shiftIsoDays(today, -1), today, [employeeId])).get(employeeId) ?? [];
  const shift = currentOrNextShift(patterns, now, tz, ov);
  return {
    firstName: employee.firstName,
    timezone: tz,
    requireDevice: employee.company.requireDeviceBinding,
    siteName: shift?.siteName ?? employee.defaultSite?.name ?? "Sin sede asignada",
    shift,
    todayShifts: shiftsOn(patterns, today, tz, ov),
  };
}
