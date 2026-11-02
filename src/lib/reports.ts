/**
 * Asistencia día a día y agregados para el tablero y los reportes (fase 7).
 * Funciones puras: reciben los datos ya cargados de UNA empresa y se prueban
 * sin base de datos.
 *
 * Reglas (las mismas de la vista de asistencia del día):
 * - Una jornada pertenece a la fecha local de su ENTRADA.
 * - Tarde: la primera entrada del día llega después del inicio del primer
 *   turno + la tolerancia de la empresa.
 * - Ausente: tenía turno, no marcó, no tiene novedad de día completo y el turno
 *   ya empezó (más la tolerancia).
 * - Solo las jornadas CERRADAS suman horas trabajadas; las abiertas o por
 *   revisar se marcan aparte para que el administrador las corrija.
 */
import { holidayOn } from "@/lib/holidays";
import { localDate, shiftsOn, type OverrideInput, type PatternInput } from "@/lib/schedule";

const DAY_MS = 86_400_000;

export type DayRowStatus = "worked" | "late" | "absent" | "novelty" | "rest" | "upcoming" | "working" | "review";

export const dayStatusLabel: Record<DayRowStatus, string> = {
  worked: "Asistió",
  late: "Llegó tarde",
  absent: "Ausente",
  novelty: "Novedad",
  rest: "Descanso",
  upcoming: "Por venir",
  working: "En jornada",
  review: "Por revisar",
};

export type AttendanceInput = {
  from: string;
  to: string;
  timeZone: string;
  now: Date;
  toleranceMin: number;
  employees: { id: string; name: string; document: string; defaultSiteId: string | null; defaultSiteName: string | null }[];
  patterns: Map<string, PatternInput[]>;
  overrides: Map<string, OverrideInput[]>;
  sessions: { employeeId: string; siteId: string; siteName: string; startAt: Date; endAt: Date | null; status: "OPEN" | "CLOSED" | "NEEDS_REVIEW" }[];
  novelties: { employeeId: string; label: string; startDate: string; endDate: string; hours: number | null }[];
};

export type DayRow = {
  employeeId: string;
  employeeName: string;
  document: string;
  date: string;
  siteId: string | null;
  siteName: string | null;
  scheduledMinutes: number;
  workedMinutes: number;
  firstIn: Date | null;
  lastOut: Date | null;
  lateMinutes: number;
  status: DayRowStatus;
  novelty: string | null;
  holiday: string | null;
};

export function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

const minutes = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000));

export function dailyAttendance(input: AttendanceInput): DayRow[] {
  const today = localDate(input.now, input.timeZone);
  const days = daysBetween(input.from, input.to);
  const byEmployee = new Map<string, AttendanceInput["sessions"]>();
  for (const s of input.sessions) byEmployee.set(s.employeeId, [...(byEmployee.get(s.employeeId) ?? []), s]);
  const rows: DayRow[] = [];

  for (const e of input.employees) {
    const mine = (byEmployee.get(e.id) ?? []).slice().sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const sessionsOn = new Map<string, typeof mine>();
    for (const s of mine) {
      const d = localDate(s.startAt, input.timeZone);
      sessionsOn.set(d, [...(sessionsOn.get(d) ?? []), s]);
    }
    for (const date of days) {
      const shifts = shiftsOn(input.patterns.get(e.id) ?? [], date, input.timeZone, input.overrides.get(e.id) ?? []);
      const sessions = sessionsOn.get(date) ?? [];
      const novelty = input.novelties.find((n) => n.employeeId === e.id && n.startDate <= date && n.endDate >= date) ?? null;
      const scheduledMinutes = shifts.reduce((a, s) => a + (s.endMin - s.startMin - s.breakMinutes), 0);
      const closed = sessions.filter((s) => s.status === "CLOSED" && s.endAt);
      const workedMinutes = closed.reduce((a, s) => a + minutes(s.startAt, s.endAt!), 0);
      const firstIn = sessions[0]?.startAt ?? null;
      const lastOut = closed.at(-1)?.endAt ?? null;
      const shiftStart = shifts[0]?.start ?? null;
      const late = shiftStart && firstIn ? minutes(shiftStart, firstIn) : 0;
      const lateMinutes = late > input.toleranceMin ? late : 0;

      let status: DayRowStatus;
      if (sessions.some((s) => s.status === "NEEDS_REVIEW") || sessions.some((s) => s.status === "OPEN" && date < today)) status = "review";
      else if (sessions.some((s) => s.status === "OPEN")) status = "working";
      else if (sessions.length > 0) status = lateMinutes > 0 ? "late" : "worked";
      else if (novelty && novelty.hours == null) status = "novelty";
      else if (shifts.length === 0) status = "rest";
      else if (shiftStart && input.now.getTime() > shiftStart.getTime() + input.toleranceMin * 60_000) status = "absent";
      else status = "upcoming";

      rows.push({
        employeeId: e.id,
        employeeName: e.name,
        document: e.document,
        date,
        siteId: sessions[0]?.siteId ?? shifts[0]?.siteId ?? e.defaultSiteId,
        siteName: sessions[0]?.siteName ?? shifts[0]?.siteName ?? e.defaultSiteName,
        scheduledMinutes,
        workedMinutes,
        firstIn,
        lastOut,
        lateMinutes,
        status,
        novelty: novelty ? (novelty.hours ? `${novelty.label} (${novelty.hours} h)` : novelty.label) : null,
        holiday: holidayOn(date)?.name ?? null,
      });
    }
  }
  return rows;
}

// ───────────────────────────── Agregados ─────────────────────────────

export type Summary = {
  scheduledDays: number;
  attendedDays: number;
  onTimeDays: number;
  absences: number;
  lates: number;
  noveltyDays: number;
  toReview: number;
  workedMinutes: number;
  scheduledMinutes: number;
  /** % de días programados con asistencia a tiempo (null si no hubo días programados con asistencia). */
  punctuality: number | null;
  /** % de días programados (ya pasados) en que el empleado asistió. */
  attendanceRate: number | null;
};

const ATTENDED: DayRowStatus[] = ["worked", "late", "working", "review"];

export function summarize(rows: DayRow[]): Summary {
  const past = rows.filter((r) => r.status !== "upcoming");
  const scheduled = past.filter((r) => r.scheduledMinutes > 0 && r.status !== "novelty");
  const attendedScheduled = scheduled.filter((r) => ATTENDED.includes(r.status));
  const onTime = attendedScheduled.filter((r) => r.lateMinutes === 0);
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  return {
    scheduledDays: scheduled.length,
    attendedDays: past.filter((r) => ATTENDED.includes(r.status)).length,
    onTimeDays: onTime.length,
    absences: past.filter((r) => r.status === "absent").length,
    lates: past.filter((r) => r.lateMinutes > 0).length,
    noveltyDays: past.filter((r) => r.status === "novelty").length,
    toReview: past.filter((r) => r.status === "review").length,
    workedMinutes: past.reduce((a, r) => a + r.workedMinutes, 0),
    scheduledMinutes: scheduled.reduce((a, r) => a + r.scheduledMinutes, 0),
    punctuality: pct(onTime.length, attendedScheduled.length),
    attendanceRate: pct(attendedScheduled.length, scheduled.length),
  };
}

/** Lunes (AAAA-MM-DD) de la semana de una fecha. */
export function weekOf(iso: string) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * DAY_MS).toISOString().slice(0, 10);
}

export function groupBy<K extends string>(rows: DayRow[], key: (r: DayRow) => K) {
  const map = new Map<K, DayRow[]>();
  for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
  return map;
}

/** Asistencia por semana: días programados, asistidos, ausencias y tardanzas. */
export function weeklySeries(rows: DayRow[]) {
  return [...groupBy(rows, (r) => weekOf(r.date)).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, rs]) => {
      const s = summarize(rs);
      return { week, scheduled: s.scheduledDays, attended: s.attendedDays, absences: s.absences, lates: s.lates };
    });
}

/** Puntualidad por mes (% de días con asistencia a tiempo). */
export function monthlyPunctuality(rows: DayRow[]) {
  return [...groupBy(rows, (r) => r.date.slice(0, 7)).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rs]) => ({ month, punctuality: summarize(rs).punctuality }));
}

/** Horas trabajadas por sede. */
export function hoursBySite(rows: DayRow[]) {
  return [...groupBy(rows.filter((r) => r.workedMinutes > 0), (r) => r.siteName ?? "Sin sede").entries()]
    .map(([site, rs]) => ({ site, hours: Math.round((rs.reduce((a, r) => a + r.workedMinutes, 0) / 60) * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);
}

/** Período anterior de la misma duración (para comparar). */
export function previousRange(from: string, to: string) {
  const len = daysBetween(from, to).length;
  const end = new Date(Date.parse(`${from}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  const start = new Date(Date.parse(`${end}T00:00:00Z`) - (len - 1) * DAY_MS).toISOString().slice(0, 10);
  return { from: start, to: end };
}
