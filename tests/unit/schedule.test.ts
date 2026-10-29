import { describe, expect, it } from "vitest";
import { currentOrNextShift, cycleIndex, localDate, shiftsOn, zonedTimeToUtc, type PatternInput } from "@/lib/schedule";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const tpl = (name: string, startMin: number, endMin: number, breakMinutes = 0) => ({ name, startMin, endMin, breakMinutes });
const day = (dayIndex: number, t: ReturnType<typeof tpl>, siteName = "Centro") => ({ dayIndex, siteId: siteName, siteName, template: t });

// Lunes 5 de octubre de 2026 = día 0
const anchor = d("2026-10-05");

describe("zona horaria de Bogotá (UTC−5, sin horario de verano)", () => {
  it("8:00 a. m. local = 13:00 UTC", () => {
    expect(zonedTimeToUtc("2026-10-27", 480).toISOString()).toBe("2026-10-27T13:00:00.000Z");
  });
  it("minutos > 1440 caen en el día siguiente", () => {
    expect(zonedTimeToUtc("2026-10-27", 1800).toISOString()).toBe("2026-10-28T11:00:00.000Z"); // 6:00 a. m. del 28
  });
  it("la fecha local cambia a la medianoche de Bogotá, no a la de UTC", () => {
    expect(localDate(new Date("2026-10-28T03:00:00Z"))).toBe("2026-10-27"); // 10 p. m. del 27 en Bogotá
  });
});

describe("cycleIndex", () => {
  it("es positivo también antes de la fecha ancla", () => {
    expect(cycleIndex("2026-10-04", anchor, 7)).toBe(6); // domingo anterior
    expect(cycleIndex("2026-10-19", anchor, 14)).toBe(0); // inicio del segundo ciclo de 14
  });
});

describe("shiftsOn", () => {
  const weekdays: PatternInput = {
    cycleDays: 7, anchorDate: anchor, effectiveFrom: anchor, effectiveTo: null,
    days: [0, 1, 2, 3, 4].map((i) => day(i, tpl("Diurno", 480, 1020, 60))),
  };

  it("lunes a viernes sí, sábado y domingo descanso", () => {
    expect(shiftsOn([weekdays], "2026-10-27")).toHaveLength(1); // martes
    expect(shiftsOn([weekdays], "2026-10-31")).toHaveLength(0); // sábado
    expect(shiftsOn([weekdays], "2026-11-01")).toHaveLength(0); // domingo
  });

  it("no aplica antes de la vigencia ni después de su fin", () => {
    expect(shiftsOn([weekdays], "2026-09-29")).toHaveLength(0);
    expect(shiftsOn([{ ...weekdays, effectiveTo: d("2026-10-20") }], "2026-10-27")).toHaveLength(0);
  });

  it("turno partido: dos turnos el mismo día, en orden", () => {
    const split: PatternInput = {
      cycleDays: 7, anchorDate: anchor, effectiveFrom: anchor, effectiveTo: null,
      days: [day(1, tpl("Tarde", 900, 1140)), day(1, tpl("Mañana", 420, 660))],
    };
    const r = shiftsOn([split], "2026-10-27");
    expect(r.map((s) => s.templateName)).toEqual(["Mañana", "Tarde"]);
  });

  it("turno nocturno: termina al día siguiente", () => {
    const night: PatternInput = {
      cycleDays: 7, anchorDate: anchor, effectiveFrom: anchor, effectiveTo: null,
      days: [day(1, tpl("Nocturno", 1320, 1800, 30))],
    };
    const [s] = shiftsOn([night], "2026-10-27");
    expect(s!.start.toISOString()).toBe("2026-10-28T03:00:00.000Z"); // 10 p. m. del 27
    expect(s!.end.toISOString()).toBe("2026-10-28T11:00:00.000Z"); // 6 a. m. del 28
  });

  it("rotativo de 14 días: semana de mañana y semana de tarde", () => {
    const rot: PatternInput = {
      cycleDays: 14, anchorDate: anchor, effectiveFrom: anchor, effectiveTo: null,
      days: [...[0, 1, 2, 3, 4].map((i) => day(i, tpl("Mañana", 360, 840))), ...[7, 8, 9, 10, 11].map((i) => day(i, tpl("Tarde", 780, 1260)))],
    };
    expect(shiftsOn([rot], "2026-10-05")[0]!.templateName).toBe("Mañana"); // semana 1
    expect(shiftsOn([rot], "2026-10-12")[0]!.templateName).toBe("Tarde"); // semana 2
    expect(shiftsOn([rot], "2026-10-19")[0]!.templateName).toBe("Mañana"); // vuelve a empezar
  });
});

describe("currentOrNextShift", () => {
  const night: PatternInput = {
    cycleDays: 7, anchorDate: anchor, effectiveFrom: anchor, effectiveTo: null,
    days: [day(1, tpl("Nocturno", 1320, 1800))], // martes 10 p. m. → miércoles 6 a. m.
  };
  it("a las 2 a. m. del miércoles devuelve el turno nocturno del martes (en curso)", () => {
    const s = currentOrNextShift([night], new Date("2026-10-28T07:00:00Z"));
    expect(s?.workDate).toBe("2026-10-27");
  });
  it("el martes a mediodía devuelve el turno de esa noche (próximo)", () => {
    expect(currentOrNextShift([night], new Date("2026-10-27T17:00:00Z"))?.templateName).toBe("Nocturno");
  });
  it("el jueves no hay turno", () => {
    expect(currentOrNextShift([night], new Date("2026-10-29T17:00:00Z"))).toBeNull();
  });
});
