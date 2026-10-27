import { describe, expect, it } from "vitest";
import { formatCOP, formatMinutes, greeting, initials, minutesToClock } from "@/lib/utils";

describe("formatMinutes", () => {
  it.each([
    [0, "0 min"],
    [45, "45 min"],
    [480, "8 h"],
    [510, "8 h 30 min"],
    [-90, "−1 h 30 min"],
  ])("%i → %s", (input, expected) => expect(formatMinutes(input)).toBe(expected));
});

describe("minutesToClock", () => {
  it("formatea horas de la mañana, tarde y medianoche", () => {
    expect(minutesToClock(480)).toBe("8:00 a. m.");
    expect(minutesToClock(1020)).toBe("5:00 p. m.");
    expect(minutesToClock(0)).toBe("12:00 a. m.");
    expect(minutesToClock(720)).toBe("12:00 p. m.");
  });
  it("acepta turnos que terminan al día siguiente", () => {
    expect(minutesToClock(1800)).toBe("6:00 a. m."); // 30:00 → 6:00 del día siguiente
  });
});

describe("formatCOP", () => {
  it("usa separador de miles colombiano y sin decimales", () => {
    expect(formatCOP(1750905)).toMatch(/^\$ ?1\.750\.905$/);
  });
});

describe("greeting (hora de Bogotá, UTC−5)", () => {
  it.each([
    ["2026-10-27T12:30:00Z", "Buenos días"], // 7:30 a. m.
    ["2026-10-27T19:00:00Z", "Buenas tardes"], // 2:00 p. m.
    ["2026-10-28T02:00:00Z", "Buenas noches"], // 9:00 p. m.
    ["2026-10-27T08:00:00Z", "Buenas noches"], // 3:00 a. m.
  ])("%s → %s", (iso, expected) => expect(greeting(new Date(iso))).toBe(expected));
});

describe("initials", () => {
  it("toma las dos primeras iniciales", () => expect(initials("María Fernanda Ruiz")).toBe("MF"));
});
