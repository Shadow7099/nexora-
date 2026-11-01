/**
 * Festivos nacionales de Colombia, calculados (no escritos a mano por año).
 *
 * Normas:
 * - Ley 51 de 1983 ("Ley Emiliani"): varios festivos se trasladan al lunes siguiente.
 * - Ley 2578 de 2026: 9 de julio, Virgen del Rosario de Chiquinquirá (trasladable).
 *   Vigente desde su promulgación (1 de junio de 2026). Tiene una demanda de
 *   inconstitucionalidad en curso: si la Corte la tumba, se ajusta VIRGEN_CHIQUINQUIRA_FROM.
 *
 * Fuentes verificadas: Ministerio del Interior (sanción de la Ley 2578 de 2026) y
 * calendarios 2026–2027 publicados por medios nacionales (ver docs/PLAN.md).
 */

export type Holiday = { date: string; name: string; source: string };

const LEY_51 = "Ley 51 de 1983 (Ley Emiliani)";
const VIRGEN_CHIQUINQUIRA_FROM = "2026-06-01";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/** Traslada al lunes siguiente si no cae en lunes (Ley Emiliani). */
function nextMonday(d: Date) {
  const dow = d.getUTCDay(); // 0 domingo … 1 lunes
  return dow === 1 ? d : addDays(d, (8 - dow) % 7);
}

export function colombianHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const fixed = (m: number, d: number, name: string): Holiday => ({ date: iso(utc(year, m, d)), name, source: LEY_51 });
  const moved = (date: Date, name: string, source = LEY_51): Holiday => ({ date: iso(nextMonday(date)), name, source });

  const list: Holiday[] = [
    fixed(1, 1, "Año Nuevo"),
    moved(utc(year, 1, 6), "Día de los Reyes Magos"),
    moved(utc(year, 3, 19), "Día de San José"),
    { date: iso(addDays(easter, -3)), name: "Jueves Santo", source: LEY_51 },
    { date: iso(addDays(easter, -2)), name: "Viernes Santo", source: LEY_51 },
    fixed(5, 1, "Día del Trabajo"),
    moved(addDays(easter, 39), "Ascensión del Señor"),
    moved(addDays(easter, 60), "Corpus Christi"),
    moved(addDays(easter, 68), "Sagrado Corazón de Jesús"),
    moved(utc(year, 6, 29), "San Pedro y San Pablo"),
    fixed(7, 20, "Día de la Independencia"),
    fixed(8, 7, "Batalla de Boyacá"),
    moved(utc(year, 8, 15), "La Asunción de la Virgen"),
    moved(utc(year, 10, 12), "Día de la Raza"),
    moved(utc(year, 11, 1), "Todos los Santos"),
    moved(utc(year, 11, 11), "Independencia de Cartagena"),
    fixed(12, 8, "Inmaculada Concepción"),
    fixed(12, 25, "Navidad"),
  ];
  const chiquinquira = nextMonday(utc(year, 7, 9));
  if (iso(chiquinquira) >= VIRGEN_CHIQUINQUIRA_FROM) {
    list.push({ date: iso(chiquinquira), name: "Virgen del Rosario de Chiquinquirá", source: "Ley 2578 de 2026 (trasladable por Ley 51 de 1983)" });
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Festivos entre dos fechas (AAAA-MM-DD, ambas incluidas). */
export function holidaysBetween(from: string, to: string): Holiday[] {
  const y0 = Number(from.slice(0, 4));
  const y1 = Number(to.slice(0, 4));
  const out: Holiday[] = [];
  for (let y = y0; y <= y1; y++) out.push(...colombianHolidays(y).filter((h) => h.date >= from && h.date <= to));
  return out;
}

export function holidayOn(date: string) {
  return colombianHolidays(Number(date.slice(0, 4))).find((h) => h.date === date) ?? null;
}
