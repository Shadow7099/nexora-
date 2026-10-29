import { DEFAULT_TZ } from "@/lib/utils";

/**
 * Resolución de turnos a partir de patrones cíclicos.
 * Funciones puras (sin BD) para poder probarlas con casos límite:
 * turnos nocturnos que cruzan la medianoche, turnos partidos y ciclos rotativos.
 */

export type PatternDayInput = {
  dayIndex: number;
  siteId: string;
  siteName: string;
  template: { name: string; startMin: number; endMin: number; breakMinutes: number };
};

export type PatternInput = {
  cycleDays: number;
  anchorDate: Date; // fecha (medianoche UTC) que corresponde al día 0 del ciclo
  effectiveFrom: Date;
  effectiveTo: Date | null;
  days: PatternDayInput[];
};

export type ResolvedShift = {
  workDate: string; // AAAA-MM-DD local
  start: Date;
  end: Date;
  startMin: number;
  endMin: number;
  breakMinutes: number;
  siteId: string;
  siteName: string;
  templateName: string;
};

const DAY_MS = 86_400_000;

/** Fecha local (AAAA-MM-DD) de un instante en una zona horaria. */
export function localDate(at: Date, timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Desfase (ms) de una zona horaria en un instante: hora local − UTC. */
function tzOffset(at: Date, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Instante UTC de "fecha local + minutos desde la medianoche local" (minutos > 1440 = día siguiente). */
export function zonedTimeToUtc(isoDate: string, minutes: number, timeZone = DEFAULT_TZ) {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const naive = Date.UTC(y, m - 1, d) + minutes * 60_000;
  let utc = naive - tzOffset(new Date(naive), timeZone);
  utc = naive - tzOffset(new Date(utc), timeZone); // segunda pasada por si hay cambio de horario
  return new Date(utc);
}

const toDay = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

/** Índice del día dentro del ciclo (siempre ≥ 0, también para fechas anteriores al ancla). */
export function cycleIndex(isoDate: string, anchorDate: Date, cycleDays: number) {
  const diff = Math.round((toDay(isoDate) - toDay(isoOf(anchorDate))) / DAY_MS);
  return ((diff % cycleDays) + cycleDays) % cycleDays;
}

/** Turnos programados en una fecha local, ordenados por hora de inicio. */
export function shiftsOn(patterns: PatternInput[], isoDate: string, timeZone = DEFAULT_TZ): ResolvedShift[] {
  const day = toDay(isoDate);
  const out: ResolvedShift[] = [];
  for (const p of patterns) {
    if (day < toDay(isoOf(p.effectiveFrom))) continue;
    if (p.effectiveTo && day > toDay(isoOf(p.effectiveTo))) continue;
    const idx = cycleIndex(isoDate, p.anchorDate, p.cycleDays);
    for (const d of p.days) {
      if (d.dayIndex !== idx) continue;
      out.push({
        workDate: isoDate,
        start: zonedTimeToUtc(isoDate, d.template.startMin, timeZone),
        end: zonedTimeToUtc(isoDate, d.template.endMin, timeZone),
        startMin: d.template.startMin,
        endMin: d.template.endMin,
        breakMinutes: d.template.breakMinutes,
        siteId: d.siteId,
        siteName: d.siteName,
        templateName: d.template.name,
      });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Turno relevante "ahora": el que está en curso, o si no, el próximo de hoy, o si
 * no, el turno nocturno de ayer que aún no termina. Útil para la pantalla del empleado.
 */
export function currentOrNextShift(patterns: PatternInput[], now: Date, timeZone = DEFAULT_TZ) {
  const today = localDate(now, timeZone);
  const yesterday = isoOf(new Date(toDay(today) - DAY_MS));
  const candidates = [...shiftsOn(patterns, yesterday, timeZone), ...shiftsOn(patterns, today, timeZone)];
  const t = now.getTime();
  return (
    candidates.find((s) => s.start.getTime() <= t && t < s.end.getTime()) ??
    candidates.find((s) => s.workDate === today && s.start.getTime() > t) ??
    null
  );
}
