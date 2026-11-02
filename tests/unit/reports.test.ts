/** Fase 7: asistencia día a día y agregados (sin base de datos). */
import { describe, expect, it } from "vitest";
import { dailyAttendance, hoursBySite, monthlyPunctuality, previousRange, summarize, weekOf, weeklySeries, type AttendanceInput } from "@/lib/reports";
import { displayCell, toCsv, type ReportTable } from "@/lib/report-table";
import type { PatternInput } from "@/lib/schedule";

const TZ = "America/Bogota";
const at = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00-05:00`);
// L–V 8:00–17:00 con 60 min de descanso (8 h programadas), ancla lunes 5 oct. 2026.
const pattern: PatternInput = {
  cycleDays: 7, anchorDate: new Date("2026-10-05T00:00:00Z"), effectiveFrom: new Date("2026-10-05T00:00:00Z"), effectiveTo: null,
  days: [0, 1, 2, 3, 4].map((dayIndex) => ({ dayIndex, siteId: "s1", siteName: "Centro", template: { name: "Día", startMin: 480, endMin: 1020, breakMinutes: 60 } })),
};
const base = (over: Partial<AttendanceInput> = {}): AttendanceInput => ({
  from: "2026-10-12", to: "2026-10-18", timeZone: TZ, now: at("2026-10-20", "12:00"), toleranceMin: 5,
  employees: [{ id: "e1", name: "Ana Ruiz", document: "123", defaultSiteId: "s1", defaultSiteName: "Centro" }],
  patterns: new Map([["e1", [pattern]]]), overrides: new Map(), sessions: [], novelties: [], ...over,
});
const s = (date: string, from: string, to: string | null, status: "OPEN" | "CLOSED" | "NEEDS_REVIEW" = "CLOSED") => ({
  employeeId: "e1", siteId: "s1", siteName: "Centro", startAt: at(date, from), endAt: to ? at(date, to) : null, status,
});

describe("asistencia día a día", () => {
  it("clasifica asistió, tarde, ausente, novedad, descanso y por revisar", () => {
    const rows = dailyAttendance(base({
      sessions: [s("2026-10-12", "08:03", "17:00"), s("2026-10-13", "08:20", "17:00"), s("2026-10-15", "08:00", null, "NEEDS_REVIEW")],
      novelties: [{ employeeId: "e1", label: "Vacaciones", startDate: "2026-10-16", endDate: "2026-10-16", hours: null }],
    }));
    expect(rows.map((r) => [r.date, r.status, r.lateMinutes])).toEqual([
      ["2026-10-12", "worked", 0], // 3 min: dentro de la tolerancia
      ["2026-10-13", "late", 20],
      ["2026-10-14", "absent", 0],
      ["2026-10-15", "review", 0],
      ["2026-10-16", "novelty", 0],
      ["2026-10-17", "rest", 0],
      ["2026-10-18", "rest", 0],
    ]);
    expect(rows[0]).toMatchObject({ scheduledMinutes: 480, workedMinutes: 537, holiday: "Día de la Raza" });
    expect(rows[3]!.workedMinutes).toBe(0); // la jornada sin salida no suma horas

    const sum = summarize(rows);
    expect(sum).toMatchObject({ scheduledDays: 4, attendedDays: 3, absences: 1, lates: 1, noveltyDays: 1, toReview: 1, workedMinutes: 537 + 520 });
    expect(sum.attendanceRate).toBe(75); // 3 de 4 días programados (la novedad no cuenta)
    expect(sum.punctuality).toBe(66.7); // 2 a tiempo de 3 asistidos
  });

  it("el turno de hoy que aún no empieza queda 'por venir' y no cuenta como ausencia", () => {
    const rows = dailyAttendance(base({ from: "2026-10-20", to: "2026-10-20", now: at("2026-10-20", "07:30") }));
    expect(rows[0]!.status).toBe("upcoming");
    expect(summarize(rows).absences).toBe(0);
  });

  it("una jornada nocturna pertenece al día de su entrada", () => {
    const rows = dailyAttendance(base({ patterns: new Map(), sessions: [{ ...s("2026-10-12", "22:00", null), endAt: at("2026-10-13", "06:00") }] }));
    expect(rows.find((r) => r.date === "2026-10-12")!.workedMinutes).toBe(480);
    expect(rows.find((r) => r.date === "2026-10-13")!.workedMinutes).toBe(0);
  });

  it("agregados: semanas, puntualidad por mes, horas por sede y período anterior", () => {
    const rows = dailyAttendance(base({ from: "2026-10-12", to: "2026-10-25", sessions: [s("2026-10-12", "08:00", "17:00"), s("2026-10-19", "09:00", "17:00")] }));
    expect(weekOf("2026-10-18")).toBe("2026-10-12");
    expect(weeklySeries(rows).map((w) => [w.week, w.scheduled, w.attended, w.absences, w.lates])).toEqual([["2026-10-12", 5, 1, 4, 0], ["2026-10-19", 2, 1, 1, 1]]); // 21–23 oct. aún no llegan (hoy = 20 oct.)
    expect(monthlyPunctuality(rows)).toEqual([{ month: "2026-10", punctuality: 50 }]);
    expect(hoursBySite(rows)).toEqual([{ site: "Centro", hours: 17 }]);
    expect(previousRange("2026-10-12", "2026-10-25")).toEqual({ from: "2026-09-28", to: "2026-10-11" });
  });
});

describe("formato de reportes", () => {
  const t: ReportTable = {
    key: "asistencia", title: "Asistencia", description: "", notes: [],
    columns: [{ key: "a", label: "Empleado", kind: "text" }, { key: "b", label: "Horas", kind: "hours" }, { key: "c", label: "Costo", kind: "money" }],
    rows: [{ a: 'Ana "La; jefa"', b: 8.5, c: 1234567 }, { a: "Luis", b: null, c: 10 }],
    totals: { b: 8.5, c: 1234577 },
    meta: { companyName: "Panadería", nit: null, from: "2026-10-01", to: "2026-10-31", generatedAt: new Date("2026-11-02T15:04:00Z"), timeZone: TZ, filters: [] },
  };
  it("CSV con punto y coma, BOM, comillas escapadas y fila de totales", () => {
    const csv = toCsv(t);
    expect(csv.startsWith("﻿Asistencia;Panadería;01/10/2026 a 31/10/2026;Generado 02/11/2026 10:04")).toBe(true);
    expect(csv).toContain('"Ana ""La; jefa""";8.5;1234567');
    expect(csv).toContain("Luis;;10");
    expect(csv.trim().split("\r\n").at(-1)).toBe("Total;8.5;1234577");
  });
  it("celdas legibles en pantalla y PDF", () => {
    expect(displayCell(1234567, "money")).toBe("$ 1.234.567");
    expect(displayCell(8.5, "hours")).toBe("8,50");
    expect(displayCell("2026-10-05", "date")).toBe("05/10/2026");
    expect(displayCell(null, "int")).toBe("—");
  });
});
