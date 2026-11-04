/** Catálogo de planes y fin de la prueba gratuita. */
import { describe, expect, it } from "vitest";
import { findPlan, planLabel, PLANS, trialDaysLeft, trialEndDate } from "@/lib/plans";

describe("planes", () => {
  it("coinciden con la lista de precios", () => {
    expect(PLANS.map((p) => [p.code, p.monthlyPriceCop, p.maxEmployees])).toEqual([
      ["basico", 79_900, 5],
      ["empresarial", 119_900, 10],
      ["crecimiento", 179_900, 20],
    ]);
    expect(planLabel("empresarial")).toBe("Plan Empresarial");
    expect(planLabel("piloto")).toBe("piloto");
    expect(findPlan(null)).toBeUndefined();
  });

  it("la prueba dura un mes calendario", () => {
    expect(trialEndDate(new Date("2026-11-04T15:00:00Z")).toISOString()).toBe("2026-12-04T15:00:00.000Z");
    expect(trialEndDate(new Date("2027-01-31T10:00:00Z")).toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(trialEndDate(new Date("2026-12-15T00:00:00Z")).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  it("cuenta los días que quedan sin bajar de cero", () => {
    const now = new Date("2026-11-04T12:00:00Z");
    expect(trialDaysLeft(new Date("2026-11-05T12:00:00Z"), now)).toBe(1);
    expect(trialDaysLeft(new Date("2026-11-05T13:00:00Z"), now)).toBe(2);
    expect(trialDaysLeft(new Date("2026-11-01T00:00:00Z"), now)).toBe(0);
  });
});
