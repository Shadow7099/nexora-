import { describe, expect, it } from "vitest";
import { colombianHolidays, easterSunday, holidayOn } from "@/lib/holidays";

describe("Pascua", () => {
  it.each([
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
  ])("%i → %s", (y, d) => expect(easterSunday(y).toISOString().slice(0, 10)).toBe(d));
});

describe("festivos de Colombia", () => {
  it("2026: 19 festivos, coinciden con el calendario publicado", () => {
    const dates = colombianHolidays(2026).map((h) => h.date);
    expect(dates).toEqual([
      "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01", "2026-05-18",
      "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-13", "2026-07-20", "2026-08-07", "2026-08-17",
      "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
    ]);
  });

  it("2027: Reyes 11 ene, San José 22 mar, Semana Santa 25–26 mar, lunes 5 y 12 de julio", () => {
    const d = new Set(colombianHolidays(2027).map((h) => h.date));
    for (const x of ["2027-01-11", "2027-03-22", "2027-03-25", "2027-03-26", "2027-07-05", "2027-07-12", "2027-12-08", "2027-12-25"]) {
      expect(d.has(x), x).toBe(true);
    }
    expect(d.size).toBe(19);
  });

  it("2025: sin el festivo de Chiquinquirá (la ley es de 2026)", () => {
    expect(colombianHolidays(2025)).toHaveLength(18);
    expect(colombianHolidays(2025).some((h) => h.name.includes("Chiquinquirá"))).toBe(false);
  });

  it("holidayOn identifica el festivo y su norma", () => {
    expect(holidayOn("2026-11-16")).toMatchObject({ name: "Independencia de Cartagena", source: expect.stringContaining("Ley 51 de 1983") });
    expect(holidayOn("2026-11-17")).toBeNull();
  });
});
