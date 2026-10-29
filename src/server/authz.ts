import "server-only";
import type { Actor } from "@/server/sessions";
import { forbidden } from "@/server/errors";

/**
 * Reglas de autorización. Todas devuelven el company_id que la consulta debe usar:
 * nunca se toma de lo que envía el navegador.
 */
export function requireCompanyAdmin(actor: Actor): string {
  if (actor.role !== "COMPANY_ADMIN" || !actor.companyId) throw forbidden();
  return actor.companyId;
}

export function requireEmployee(actor: Actor): { companyId: string; employeeId: string } {
  if (actor.role !== "EMPLOYEE" || !actor.companyId || !actor.employeeId) throw forbidden();
  return { companyId: actor.companyId, employeeId: actor.employeeId };
}

export function requireSuperadmin(actor: Actor) {
  if (actor.role !== "SUPERADMIN") throw forbidden();
}
