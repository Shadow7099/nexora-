/**
 * Formato común de los reportes (fase 7): columnas tipadas, filas y totales.
 * La misma estructura se muestra en pantalla y se exporta a CSV, Excel y PDF,
 * así los números son idénticos en todos los formatos.
 */

export type ColumnKind = "text" | "date" | "datetime" | "int" | "hours" | "money" | "percent";
export type Column = { key: string; label: string; kind: ColumnKind };
export type Cell = string | number | null;

export type ReportTable = {
  key: ReportKey;
  title: string;
  description: string;
  columns: Column[];
  rows: Record<string, Cell>[];
  /** Totales por columna numérica (solo las que tiene sentido sumar). */
  totals: Record<string, number>;
  meta: { companyName: string; nit: string | null; from: string; to: string; generatedAt: Date; timeZone: string; filters: string[] };
  notes: string[];
};

export const REPORTS = {
  asistencia: { title: "Asistencia por período", description: "Jornadas por empleado y día: programado, trabajado, tardanzas, ausencias y novedades." },
  "horas-extra": { title: "Horas extra", description: "Tiempo detectado, autorizado y su tratamiento en la pre-nómina, con quién decidió." },
  novedades: { title: "Novedades", description: "Vacaciones, incapacidades, permisos y licencias que se cruzan con el período." },
  "pre-nomina": { title: "Pre-nómina estimada", description: "Devengado, deducciones, neto y costo del empleador de los períodos calculados." },
  intentos: { title: "Intentos rechazados", description: "Marcaciones rechazadas: fuera del radio, celular no vinculado, QR inválido…" },
} as const;
export type ReportKey = keyof typeof REPORTS;
export const isReportKey = (k: string): k is ReportKey => k in REPORTS;

// ───────────────────────────── Formato de celdas ─────────────────────────────

/** Fecha/hora local legible (dd/mm/aaaa hh:mm) en la zona de la empresa. */
export function formatDateTime(d: Date, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export const formatIsoDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Texto de una celda para pantalla y PDF (CSV y Excel usan el valor crudo). */
export function displayCell(value: Cell, kind: ColumnKind) {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatIsoDate(value) : value;
  switch (kind) {
    case "money":
      return `$ ${Math.round(value).toLocaleString("es-CO")}`;
    case "hours":
      return value.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "percent":
      return `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
    default:
      return value.toLocaleString("es-CO");
  }
}

/** Minutos → horas con 2 decimales (lo que se exporta). */
export const toHours = (min: number) => Math.round((min / 60) * 100) / 100;

// ───────────────────────────── CSV ─────────────────────────────

const csvEscape = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * CSV separado por punto y coma (lo que espera Excel con configuración regional
 * de Colombia), con BOM para que reconozca las tildes. Números con punto decimal.
 */
export function toCsv(t: ReportTable) {
  const lines: string[] = [];
  lines.push([t.title, t.meta.companyName, `${formatIsoDate(t.meta.from)} a ${formatIsoDate(t.meta.to)}`, `Generado ${formatDateTime(t.meta.generatedAt, t.meta.timeZone)}`].map(csvEscape).join(";"));
  if (t.meta.filters.length) lines.push(csvEscape(`Filtros: ${t.meta.filters.join(", ")}`));
  lines.push("");
  lines.push(t.columns.map((c) => csvEscape(c.label)).join(";"));
  for (const r of t.rows) lines.push(t.columns.map((c) => csvEscape(r[c.key] == null ? "" : String(r[c.key]))).join(";"));
  if (Object.keys(t.totals).length) lines.push(t.columns.map((c, i) => (i === 0 ? "Total" : c.key in t.totals ? String(t.totals[c.key]) : "")).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Nombre de archivo: nexora-asistencia-2026-10-01_2026-10-31.xlsx */
export const reportFileName = (t: ReportTable, ext: string) => `nexora-${t.key}-${t.meta.from}_${t.meta.to}.${ext}`;
