/**
 * Planes comerciales de Nexora (precios mensuales en pesos colombianos).
 *
 * Los planes limitan el número de empleados activos; las sedes no tienen
 * límite. Quien necesite más empleados que su plan agrega "personal adicional"
 * con tarifa por empleado: el superadministrador amplía el límite de la empresa.
 */

export type PlanCode = "basico" | "empresarial" | "crecimiento";

export type Plan = { code: PlanCode; name: string; monthlyPriceCop: number; maxEmployees: number; maxSites: number | null };

export const PLANS: readonly Plan[] = [
  { code: "basico", name: "Plan Básico", monthlyPriceCop: 79_900, maxEmployees: 5, maxSites: null },
  { code: "empresarial", name: "Plan Empresarial", monthlyPriceCop: 119_900, maxEmployees: 10, maxSites: null },
  { code: "crecimiento", name: "Plan Crecimiento", monthlyPriceCop: 179_900, maxEmployees: 20, maxSites: null },
];

export const PLAN_CODES = PLANS.map((p) => p.code) as [PlanCode, ...PlanCode[]];
export const DEFAULT_PLAN: PlanCode = "basico";

/** Duración de la prueba gratuita, en meses calendario. */
export const TRIAL_MONTHS = 1;

export function findPlan(code: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.code === code);
}

/** Nombre para mostrar; los códigos antiguos o libres (p. ej. "piloto") se muestran tal cual. */
export function planLabel(code: string | null | undefined): string {
  return findPlan(code)?.name ?? code ?? "—";
}

/** Fin de la prueba: el mismo día del mes siguiente (31 ene → 28/29 feb). */
export function trialEndDate(from: Date, months = TRIAL_MONTHS): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/** Días completos que le quedan a la prueba (0 si ya terminó). */
export function trialDaysLeft(endsAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000));
}
