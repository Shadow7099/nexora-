/**
 * Pre-nómina ESTIMADA (no es una liquidación legal). Funciones puras: no tocan
 * la base de datos y se prueban con casos calculados a mano.
 *
 * Principios:
 * - Ningún porcentaje o valor vive en el código: todo sale de `labor_parameter`
 *   con su vigencia. Si falta un parámetro, la estimación queda BLOQUEADA con
 *   una advertencia y no se muestra ningún número.
 * - Solo se pagan como extra los minutos APROBADOS por el administrador. Los
 *   minutos detectados que no se aprobaron siguen registrados, pero no se pagan
 *   como extra ni generan recargos.
 * - Cada línea guarda una explicación legible de cómo se calculó.
 */
import { holidayOn } from "@/lib/holidays";
import { tzOffset } from "@/lib/schedule";

const DAY_MS = 86_400_000;

export type ParamRow = {
  key: string;
  value: number;
  unit: string;
  validFrom: string; // AAAA-MM-DD
  validTo: string | null;
  legalSource: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  companyId: string | null;
};

export type NoveltyKind =
  | "VACACIONES" | "INCAPACIDAD_COMUN" | "INCAPACIDAD_LABORAL" | "LICENCIA_MATERNIDAD" | "LICENCIA_PATERNIDAD" | "LICENCIA_REMUNERADA"
  | "LICENCIA_NO_REMUNERADA" | "LICENCIA_LUTO" | "CALAMIDAD_DOMESTICA" | "PERMISO" | "AUSENCIA_INJUSTIFICADA" | "SUSPENSION";

export type SessionInput = {
  startAt: Date;
  endAt: Date;
  /** Minutos detectados como extra al final de esta jornada (0 si no hay solicitud). */
  detectedExtraMinutes: number;
  /** Minutos aprobados por el administrador (≤ detectados). */
  approvedExtraMinutes: number;
  /** Descanso no remunerado programado ese día (se descuenta del tiempo ordinario). */
  unpaidBreakMinutes: number;
};

export type ContractInput = {
  contractType: "INDEFINIDO" | "FIJO" | "OBRA_LABOR" | "APRENDIZAJE" | "PRESTACION_SERVICIOS";
  salaryType: "ORDINARIO" | "INTEGRAL";
  monthlySalary: number;
  weeklyHours: number;
  arlRiskClass: "I" | "II" | "III" | "IV" | "V";
  startDate: string;
  endDate: string | null;
};

export type EstimateInput = {
  period: { start: string; end: string };
  contract: ContractInput | null;
  sessions: SessionInput[];
  /** Solo novedades APROBADAS. */
  novelties: { type: NoveltyKind; startDate: string; endDate: string; hours: number | null }[];
  pending: { sessionsToReview: number; overtimePending: number; noveltiesPending: number };
  parafiscalExempt: boolean;
  timeZone: string;
  params: ParamRow[];
};

export type LineKind = "DEVENGADO" | "DEDUCCION" | "APORTE_EMPLEADOR" | "PROVISION";
export type Line = { concept: string; label: string; kind: LineKind; quantity: number; rate: number; amount: number; basis: string };
export type Warning = { code: string; severity: "block" | "warn" | "info"; message: string };

export type EstimateResult = {
  blocked: boolean;
  lines: Line[];
  gross: number;
  deductions: number;
  net: number;
  employerCost: number;
  warnings: Warning[];
  /** Copia de cada parámetro usado (reproducible aunque luego cambie la tabla). */
  snapshot: ParamRow[];
  paidDays: number;
  minutes: MinuteSummary;
};

// ───────────────────────────── Parámetros ─────────────────────────────

/** Busca el valor vigente en una fecha; el de la empresa tiene prioridad sobre el nacional. */
export class ParamSet {
  private used = new Map<string, ParamRow>();
  readonly missing = new Map<string, string>(); // clave → primera fecha sin valor

  constructor(private rows: ParamRow[]) {}

  find(key: string, date: string): ParamRow | null {
    const candidates = this.rows.filter((r) => r.key === key && r.validFrom <= date && (r.validTo == null || r.validTo >= date));
    candidates.sort((a, b) => (a.companyId ? 0 : 1) - (b.companyId ? 0 : 1) || b.validFrom.localeCompare(a.validFrom));
    return candidates[0] ?? null;
  }

  /** Valor numérico o null (y lo anota como faltante). */
  get(key: string, date: string): number | null {
    const r = this.find(key, date);
    if (!r) {
      if (!this.missing.has(key)) this.missing.set(key, date);
      return null;
    }
    this.used.set(`${r.companyId ?? "*"}|${r.key}|${r.validFrom}`, r);
    return r.value;
  }

  snapshot() {
    return [...this.used.values()].sort((a, b) => a.key.localeCompare(b.key) || a.validFrom.localeCompare(b.validFrom));
  }
}

// ───────────────────────────── Fechas ─────────────────────────────

const ymd = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const isoFromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => isoFromMs(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS);
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Días entre dos fechas (ambas incluidas) en mes comercial de 30 días, como se
 * liquida la nómina en Colombia: el día 31 no suma y febrero completo cuenta 30.
 */
export function commercialDays(from: string, to: string) {
  if (to < from) return 0;
  const [y1, m1, d1] = ymd(from);
  const [y2, m2, d2raw] = ymd(to);
  const start = Math.min(d1, 30);
  const d2 = d2raw === lastDayOfMonth(y2, m2) ? 30 : Math.min(d2raw, 30);
  return Math.max(0, y2 * 360 + (m2 - 1) * 30 + d2 - (y1 * 360 + (m1 - 1) * 30 + start) + 1);
}

/** Quincena o mes que contiene una fecha. */
export function periodFor(date: string, frequency: "QUINCENAL" | "MENSUAL") {
  const [y, m, d] = ymd(date);
  const mm = String(m).padStart(2, "0");
  const last = String(lastDayOfMonth(y, m)).padStart(2, "0");
  if (frequency === "MENSUAL") return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${last}` };
  return d <= 15 ? { start: `${y}-${mm}-01`, end: `${y}-${mm}-15` } : { start: `${y}-${mm}-16`, end: `${y}-${mm}-${last}` };
}

/** Un período válido es una quincena (1–15 o 16–fin) o un mes completo. */
export function periodFrequency(start: string, end: string): "QUINCENAL" | "MENSUAL" | null {
  const q = periodFor(start, "QUINCENAL");
  if (q.start === start && q.end === end) return "QUINCENAL";
  const m = periodFor(start, "MENSUAL");
  if (m.start === start && m.end === end) return "MENSUAL";
  return null;
}

const isSundayOrHoliday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay() === 0 || holidayOn(iso) !== null;

// ──────────────────────── Clasificación de minutos ────────────────────────

/** Minutos por tipo. `byRate` agrupa por recargo dominical vigente (cambia por fecha). */
export type MinuteSummary = {
  ordinaryDay: number;
  ordinaryNight: number;
  /** clave = % dominical vigente ese día */
  ordinaryHolidayDay: Record<string, number>;
  ordinaryHolidayNight: Record<string, number>;
  extraDay: number;
  extraNight: number;
  extraHolidayDay: Record<string, number>;
  extraHolidayNight: Record<string, number>;
  /** Detectados pero no aprobados como extra (registrados, no pagados como extra). */
  notApproved: number;
  unpaidBreak: number;
};

const emptySummary = (): MinuteSummary => ({
  ordinaryDay: 0, ordinaryNight: 0, ordinaryHolidayDay: {}, ordinaryHolidayNight: {},
  extraDay: 0, extraNight: 0, extraHolidayDay: {}, extraHolidayNight: {}, notApproved: 0, unpaidBreak: 0,
});

const bump = (rec: Record<string, number>, k: string, n = 1) => (rec[k] = (rec[k] ?? 0) + n);

/**
 * Clasifica cada minuto de las jornadas: ordinario/extra, diurno/nocturno,
 * domingo-festivo o no, según la franja nocturna y el recargo vigentes en la
 * FECHA LOCAL de ese minuto (una noche que cruza a domingo cambia de tipo a la
 * medianoche).
 */
export function classifyMinutes(sessions: SessionInput[], timeZone: string, params: ParamSet): MinuteSummary {
  const out = emptySummary();
  const dayInfo = new Map<string, { nightStart: number | null; nightEnd: number | null; holiday: boolean; rdf: number | null }>();
  const info = (iso: string) => {
    let v = dayInfo.get(iso);
    if (!v) {
      const holiday = isSundayOrHoliday(iso);
      v = { nightStart: params.get("NOCTURNA_INICIO", iso), nightEnd: params.get("NOCTURNA_FIN", iso), holiday, rdf: holiday ? params.get("RECARGO_DOMINICAL_FESTIVO", iso) : 0 };
      dayInfo.set(iso, v);
    }
    return v;
  };

  for (const s of sessions) {
    const total = Math.max(0, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60_000));
    const detected = Math.min(total, Math.max(0, s.detectedExtraMinutes));
    const approved = Math.min(detected, Math.max(0, s.approvedExtraMinutes));
    const extraStart = total - detected;
    const extraEnd = extraStart + approved;
    // Colombia no tiene horario de verano: el desfase del inicio sirve para toda la jornada.
    const localStart = s.startAt.getTime() + tzOffset(s.startAt, timeZone);
    const ord = { day: 0, night: 0, hDay: {} as Record<string, number>, hNight: {} as Record<string, number> };

    for (let i = 0; i < total; i++) {
      if (i >= extraEnd) {
        out.notApproved++;
        continue;
      }
      const local = localStart + i * 60_000;
      const iso = isoFromMs(local);
      const mod = Math.floor((((local % DAY_MS) + DAY_MS) % DAY_MS) / 60_000);
      const d = info(iso);
      if (d.nightStart == null || d.nightEnd == null || d.rdf == null) continue; // falta parámetro: quedará bloqueado
      const night = d.nightStart > d.nightEnd ? mod >= d.nightStart || mod < d.nightEnd : mod >= d.nightStart && mod < d.nightEnd;
      const rate = String(d.rdf);
      if (i < extraStart) {
        if (d.holiday) bump(night ? ord.hNight : ord.hDay, rate);
        else if (night) ord.night++;
        else ord.day++;
      } else if (d.holiday) bump(night ? out.extraHolidayNight : out.extraHolidayDay, rate);
      else if (night) out.extraNight++;
      else out.extraDay++;
    }

    // Descanso no remunerado: se descuenta del tiempo ordinario en proporción a cada tipo.
    const buckets: { get: () => number; set: (n: number) => void }[] = [
      { get: () => ord.day, set: (n) => (ord.day = n) },
      { get: () => ord.night, set: (n) => (ord.night = n) },
      ...Object.keys(ord.hDay).map((k) => ({ get: () => ord.hDay[k]!, set: (n: number) => (ord.hDay[k] = n) })),
      ...Object.keys(ord.hNight).map((k) => ({ get: () => ord.hNight[k]!, set: (n: number) => (ord.hNight[k] = n) })),
    ];
    const ordTotal = buckets.reduce((a, b) => a + b.get(), 0);
    const brk = Math.min(ordTotal, Math.max(0, s.unpaidBreakMinutes));
    if (brk > 0) {
      const shares = buckets.map((b) => (b.get() * brk) / ordTotal);
      const floors = shares.map(Math.floor);
      let left = brk - floors.reduce((a, b) => a + b, 0);
      const order = shares.map((v, i) => [v - floors[i]!, i] as const).sort((a, b) => b[0] - a[0]);
      for (const [, i] of order) {
        if (left <= 0) break;
        floors[i]!++;
        left--;
      }
      buckets.forEach((b, i) => b.set(b.get() - floors[i]!));
      out.unpaidBreak += brk;
    }
    out.ordinaryDay += ord.day;
    out.ordinaryNight += ord.night;
    for (const [k, v] of Object.entries(ord.hDay)) bump(out.ordinaryHolidayDay, k, v);
    for (const [k, v] of Object.entries(ord.hNight)) bump(out.ordinaryHolidayNight, k, v);
  }
  return out;
}

// ───────────────────────────── Estimación ─────────────────────────────

const UNPAID: NoveltyKind[] = ["LICENCIA_NO_REMUNERADA", "SUSPENSION", "AUSENCIA_INJUSTIFICADA"];
const NEEDS_REVIEW: NoveltyKind[] = ["INCAPACIDAD_COMUN", "INCAPACIDAD_LABORAL", "LICENCIA_MATERNIDAD", "LICENCIA_PATERNIDAD"];

// Redondeo al peso, inmune a errores de coma flotante (124.547,4999… → 124.548).
const round = (n: number) => Math.round(Math.round(n * 1000) / 1000);
const hrs = (min: number) => Math.round((min / 60) * 100) / 100;
const pct = (n: number) => `${String(n).replace(".", ",")} %`;
const cop = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
const fmtDate = (iso: string) => {
  const [y, m, d] = ymd(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

/** Etiquetas de los conceptos (también para la pantalla). */
export const CONCEPT_LABEL: Record<string, string> = {
  SALARIO_BASICO: "Salario básico",
  RN: "Recargo nocturno",
  RDF: "Recargo dominical/festivo",
  RNDF: "Recargo nocturno dominical/festivo",
  HED: "Horas extra diurnas",
  HEN: "Horas extra nocturnas",
  HEDDF: "Horas extra diurnas dominicales/festivas",
  HENDF: "Horas extra nocturnas dominicales/festivas",
  AUX_TRANSPORTE: "Auxilio de transporte",
  SALUD_EMPLEADO: "Salud (trabajador)",
  PENSION_EMPLEADO: "Pensión (trabajador)",
  SALUD_EMPLEADOR: "Salud (empleador)",
  PENSION_EMPLEADOR: "Pensión (empleador)",
  ARL: "ARL",
  CAJA_COMPENSACION: "Caja de compensación",
  ICBF: "ICBF",
  SENA: "SENA",
  CESANTIAS: "Cesantías",
  INT_CESANTIAS: "Intereses sobre cesantías",
  PRIMA: "Prima de servicios",
  VACACIONES: "Vacaciones",
};

function blockedResult(warnings: Warning[], params: ParamSet, minutes = emptySummary(), paidDays = 0): EstimateResult {
  return { blocked: true, lines: [], gross: 0, deductions: 0, net: 0, employerCost: 0, warnings, snapshot: params.snapshot(), paidDays, minutes };
}

export function estimatePayroll(input: EstimateInput): EstimateResult {
  const { period, contract } = input;
  const params = new ParamSet(input.params);
  const warnings: Warning[] = [];
  const end = period.end;

  if (input.pending.sessionsToReview > 0)
    warnings.push({ code: "SESSIONS_REVIEW", severity: "warn", message: `${input.pending.sessionsToReview} jornada(s) abiertas o por revisar no se incluyen hasta que se cierren o corrijan.` });
  if (input.pending.overtimePending > 0)
    warnings.push({ code: "OVERTIME_PENDING", severity: "warn", message: `${input.pending.overtimePending} solicitud(es) de horas extra sin decidir: esos minutos no se pagan como extra hasta aprobarlos.` });
  if (input.pending.noveltiesPending > 0)
    warnings.push({ code: "NOVELTY_PENDING", severity: "warn", message: `${input.pending.noveltiesPending} novedad(es) pendientes de aprobar no se tienen en cuenta.` });

  // ── Contrato ──
  if (!contract) return blockedResult([{ code: "NO_CONTRACT", severity: "block", message: "Sin contrato vigente en el período: no se puede estimar." }, ...warnings], params);
  if (contract.contractType === "PRESTACION_SERVICIOS")
    return blockedResult([{ code: "NOT_EMPLOYMENT", severity: "block", message: "Contrato de prestación de servicios: no es nómina laboral." }, ...warnings], params);
  if (contract.contractType === "APRENDIZAJE")
    return blockedResult([{ code: "APPRENTICE", severity: "block", message: "Contrato de aprendizaje: tiene reglas propias (cuota de sostenimiento) que Nexora aún no estima." }, ...warnings], params);
  if (contract.salaryType === "INTEGRAL")
    return blockedResult([{ code: "INTEGRAL", severity: "block", message: "Salario integral: tiene reglas propias (factor prestacional) que Nexora aún no estima." }, ...warnings], params);
  if (!(contract.monthlySalary > 0) || !(contract.weeklyHours > 0))
    return blockedResult([{ code: "CONTRACT_DATA", severity: "block", message: "El contrato no tiene salario u horas semanales válidos." }, ...warnings], params);

  const from = contract.startDate > period.start ? contract.startDate : period.start;
  const to = contract.endDate && contract.endDate < end ? contract.endDate : end;
  if (to < from) return blockedResult([{ code: "NO_CONTRACT", severity: "block", message: "Sin contrato vigente en el período: no se puede estimar." }, ...warnings], params);

  // ── Parámetros de referencia (vigentes al cierre del período) ──
  const ref = to;
  const P = (key: string) => params.get(key, ref);
  const smmlv = P("SMMLV");
  const aux = P("AUX_TRANSPORTE");
  const auxCap = P("AUX_TRANSPORTE_TOPE_SMMLV");
  const maxWeekly = P("JORNADA_MAX_SEMANAL");
  const rn = P("RECARGO_NOCTURNO");
  const hed = P("HE_DIURNA");
  const hen = P("HE_NOCTURNA");
  const saludE = P("SALUD_EMPLEADO");
  const pensionE = P("PENSION_EMPLEADO");
  const saludR = P("SALUD_EMPLEADOR");
  const pensionR = P("PENSION_EMPLEADOR");
  const arl = P(`ARL_CLASE_${contract.arlRiskClass}`);
  const caja = P("CAJA_COMPENSACION");
  const icbf = P("ICBF");
  const sena = P("SENA");
  const exemptCap = P("EXONERACION_TOPE_SMMLV");
  const fspFrom = P("FONDO_SOLIDARIDAD_DESDE_SMMLV");
  const cesDays = P("CESANTIAS_DIAS_ANIO");
  const intCes = P("INT_CESANTIAS");
  const primaDays = P("PRIMA_DIAS_ANIO");
  const vacDays = P("VACACIONES_DIAS_ANIO");

  const minutes = classifyMinutes(input.sessions, input.timeZone, params);

  // ── Días pagados ──
  const periodDays = commercialDays(from, to);
  let unpaidDays = 0;
  let noAuxDays = 0;
  let review = false;
  for (const n of input.novelties) {
    const a = n.startDate > from ? n.startDate : from;
    const b = n.endDate < to ? n.endDate : to;
    if (b < a) continue;
    const days = commercialDays(a, b);
    if (UNPAID.includes(n.type)) unpaidDays += days;
    else if (!(n.type === "PERMISO" && n.hours != null)) noAuxDays += days; // vacaciones, incapacidades, licencias: pagadas, sin auxilio
    if (NEEDS_REVIEW.includes(n.type)) review = true;
  }
  const paidDays = Math.max(0, periodDays - unpaidDays);
  const auxDays = Math.max(0, paidDays - noAuxDays);

  if (params.missing.size > 0) {
    const list = [...params.missing.entries()].map(([k, d]) => `${k} (${fmtDate(d)})`).join(", ");
    return blockedResult([{ code: "MISSING_PARAMETER", severity: "block", message: `Faltan parámetros legales para calcular: ${list}. No se muestra ningún valor.` }, ...warnings], params, minutes, paidDays);
  }
  // Desde aquí todos los parámetros existen.
  const v = (n: number | null) => n as number;

  if (review)
    warnings.push({ code: "INCAPACITY", severity: "warn", message: "Hay incapacidades o licencias en el período: se estimaron como salario normal, pero quién paga cada día (empleador, EPS o ARL) y su valor requieren revisión." });
  if (contract.weeklyHours > v(maxWeekly))
    warnings.push({ code: "OVER_MAX_HOURS", severity: "warn", message: `El contrato pacta ${contract.weeklyHours} h semanales y la jornada máxima vigente es ${v(maxWeekly)} h.` });
  const fullTime = contract.weeklyHours >= v(maxWeekly);
  const minForHours = v(smmlv) * Math.min(1, contract.weeklyHours / v(maxWeekly));
  if (contract.monthlySalary < minForHours - 0.5)
    warnings.push({ code: "BELOW_MINIMUM", severity: "warn", message: `El salario (${cop(contract.monthlySalary)}) es inferior al mínimo legal para ${contract.weeklyHours} h semanales (${cop(minForHours)}).` });
  if (!fullTime)
    warnings.push({ code: "PART_TIME", severity: "info", message: "Contrato de tiempo parcial: la cotización a seguridad social puede hacerse por semanas (Decreto 2616 de 2013); aquí se estimó sobre lo devengado." });

  const lines: Line[] = [];
  const add = (concept: string, kind: LineKind, quantity: number, rate: number, amount: number, basis: string, label = CONCEPT_LABEL[concept] ?? concept) =>
    lines.push({ concept, label, kind, quantity, rate, amount: round(amount), basis });

  // ── Devengados ──
  const monthly = contract.monthlySalary;
  const daily = monthly / 30;
  const monthlyHours = (contract.weeklyHours / 6) * 30;
  const hourly = monthly / monthlyHours;
  const hourBasis = `valor hora ${cop(hourly)} = salario ${cop(monthly)} ÷ ${hrs(monthlyHours * 60)} h/mes (${contract.weeklyHours} h semanales ÷ 6 × 30)`;

  add("SALARIO_BASICO", "DEVENGADO", paidDays, daily, (monthly * paidDays) / 30,
    `${paidDays} días × ${cop(daily)} (salario ${cop(monthly)} ÷ 30)${unpaidDays ? `; se descuentan ${unpaidDays} día(s) no remunerados` : ""}`);

  const surcharge = (concept: string, min: number, pctTotal: number, extra: boolean, detail: string) => {
    if (min <= 0) return;
    const factor = (extra ? 100 + pctTotal : pctTotal) / 100;
    add(concept, "DEVENGADO", hrs(min), hourly * factor, (min / 60) * hourly * factor,
      `${hrs(min)} h × ${cop(hourly * factor)} (${extra ? `100 % + ${detail}` : detail}); ${hourBasis}`);
  };
  surcharge("RN", minutes.ordinaryNight, v(rn), false, `recargo nocturno ${pct(v(rn))}`);
  for (const [r, m] of Object.entries(minutes.ordinaryHolidayDay)) surcharge("RDF", m, Number(r), false, `recargo dominical/festivo ${pct(Number(r))}`);
  for (const [r, m] of Object.entries(minutes.ordinaryHolidayNight)) surcharge("RNDF", m, v(rn) + Number(r), false, `nocturno ${pct(v(rn))} + dominical/festivo ${pct(Number(r))}`);
  surcharge("HED", minutes.extraDay, v(hed), true, `extra diurna ${pct(v(hed))}`);
  surcharge("HEN", minutes.extraNight, v(hen), true, `extra nocturna ${pct(v(hen))}`);
  for (const [r, m] of Object.entries(minutes.extraHolidayDay)) surcharge("HEDDF", m, v(hed) + Number(r), true, `extra diurna ${pct(v(hed))} + dominical/festivo ${pct(Number(r))}`);
  for (const [r, m] of Object.entries(minutes.extraHolidayNight)) surcharge("HENDF", m, v(hen) + Number(r), true, `extra nocturna ${pct(v(hen))} + dominical/festivo ${pct(Number(r))}`);

  const salaryLine = lines[0]!.amount;
  const variable = lines.slice(1).reduce((a, l) => a + l.amount, 0);
  const auxApplies = monthly <= v(auxCap) * v(smmlv);
  if (auxApplies && auxDays > 0) {
    add("AUX_TRANSPORTE", "DEVENGADO", auxDays, v(aux) / 30, (v(aux) * auxDays) / 30,
      `${auxDays} días × ${cop(v(aux) / 30)} (auxilio ${cop(v(aux))} ÷ 30); aplica porque el salario no supera ${v(auxCap)} SMMLV${noAuxDays ? `; sin auxilio en ${noAuxDays} día(s) de vacaciones, incapacidad o licencia` : ""}`);
  }
  const auxAmount = lines.find((l) => l.concept === "AUX_TRANSPORTE")?.amount ?? 0;

  // ── Base de cotización (IBC): salario + recargos + extras; el auxilio no cotiza ──
  let ibc = salaryLine + variable;
  let ibcNote = `IBC ${cop(ibc)} (salario + recargos + extras; el auxilio de transporte no cotiza)`;
  const ibcFloor = (v(smmlv) / 30) * paidDays;
  if (fullTime && paidDays > 0 && ibc < ibcFloor) {
    ibc = ibcFloor;
    ibcNote = `IBC llevado al mínimo: ${cop(ibc)} (1 SMMLV proporcional a ${paidDays} días)`;
  }
  if (monthly >= v(fspFrom) * v(smmlv))
    warnings.push({ code: "SOLIDARITY_FUND", severity: "warn", message: `El salario es igual o superior a ${v(fspFrom)} SMMLV: debe aportar al Fondo de Solidaridad Pensional, que esta estimación no incluye.` });

  // ── Deducciones del trabajador ──
  add("SALUD_EMPLEADO", "DEDUCCION", 1, v(saludE), (ibc * v(saludE)) / 100, `${pct(v(saludE))} del ${ibcNote}`);
  add("PENSION_EMPLEADO", "DEDUCCION", 1, v(pensionE), (ibc * v(pensionE)) / 100, `${pct(v(pensionE))} del ${ibcNote}`);

  // ── Aportes del empleador ──
  const exempt = input.parafiscalExempt && monthly < v(exemptCap) * v(smmlv);
  const exemptNote = `exonerado (art. 114-1 E.T.: la empresa aplica la exoneración y el trabajador devenga menos de ${v(exemptCap)} SMMLV)`;
  add("SALUD_EMPLEADOR", "APORTE_EMPLEADOR", 1, exempt ? 0 : v(saludR), exempt ? 0 : (ibc * v(saludR)) / 100, exempt ? `$ 0: ${exemptNote}` : `${pct(v(saludR))} del ${ibcNote}`);
  add("PENSION_EMPLEADOR", "APORTE_EMPLEADOR", 1, v(pensionR), (ibc * v(pensionR)) / 100, `${pct(v(pensionR))} del ${ibcNote}`);
  add("ARL", "APORTE_EMPLEADOR", 1, v(arl), (ibc * v(arl)) / 100, `${pct(v(arl))} (riesgo ${contract.arlRiskClass}, tarifa inicial) del ${ibcNote}`, `ARL riesgo ${contract.arlRiskClass}`);
  add("CAJA_COMPENSACION", "APORTE_EMPLEADOR", 1, v(caja), (ibc * v(caja)) / 100, `${pct(v(caja))} del ${ibcNote}`);
  add("ICBF", "APORTE_EMPLEADOR", 1, exempt ? 0 : v(icbf), exempt ? 0 : (ibc * v(icbf)) / 100, exempt ? `$ 0: ${exemptNote}` : `${pct(v(icbf))} del ${ibcNote}`);
  add("SENA", "APORTE_EMPLEADOR", 1, exempt ? 0 : v(sena), exempt ? 0 : (ibc * v(sena)) / 100, exempt ? `$ 0: ${exemptNote}` : `${pct(v(sena))} del ${ibcNote}`);

  // ── Provisiones de prestaciones sociales ──
  const prestBase = salaryLine + variable + auxAmount;
  const prestNote = `base ${cop(prestBase)} (salario + recargos + extras + auxilio de transporte)`;
  const ces = (prestBase * v(cesDays)) / 360;
  add("CESANTIAS", "PROVISION", 1, v(cesDays), ces, `${prestNote} × ${v(cesDays)} días ÷ 360`);
  add("INT_CESANTIAS", "PROVISION", 1, v(intCes), (ces * v(intCes)) / 100, `${pct(v(intCes))} anual sobre las cesantías del período (${cop(ces)})`);
  add("PRIMA", "PROVISION", 1, v(primaDays), (prestBase * v(primaDays)) / 360, `${prestNote} × ${v(primaDays)} días ÷ 360`);
  add("VACACIONES", "PROVISION", 1, v(vacDays), (salaryLine * v(vacDays)) / 360,
    `salario del período ${cop(salaryLine)} × ${v(vacDays)} días ÷ 360 (no incluye extras ni auxilio)`);

  const sum = (k: LineKind) => lines.filter((l) => l.kind === k).reduce((a, l) => a + l.amount, 0);
  const gross = sum("DEVENGADO");
  const deductions = sum("DEDUCCION");
  const snapshot = params.snapshot();
  if (snapshot.some((p) => p.verifiedAt == null))
    warnings.push({ code: "PARAMS_UNVERIFIED", severity: "info", message: "Algunos parámetros legales aún no han sido validados por un contador." });

  return {
    blocked: false,
    lines,
    gross,
    deductions,
    net: gross - deductions,
    employerCost: gross + sum("APORTE_EMPLEADOR") + sum("PROVISION"),
    warnings,
    snapshot,
    paidDays,
    minutes,
  };
}

export { addDays as addIsoDays };
