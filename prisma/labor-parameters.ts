/**
 * Parámetros laborales nacionales de Colombia (company_id = null), versionados
 * por fecha. Se cargan con `seed.ts` y, en producción, con el SQL generado por
 * `scripts/labor-parameters-sql.ts`.
 *
 * REGLAS
 * - Ningún valor se inventa: cada fila cita la norma y una URL oficial.
 * - `verifiedAt` queda en null hasta que un contador lo valide desde la
 *   pantalla de Plataforma → Parámetros. Mientras tanto la pre-nómina se
 *   calcula, pero muestra la advertencia "parámetros sin validar".
 * - Investigado el 1 nov. 2026 contrastando varias fuentes secundarias
 *   coincidentes (las sedes oficiales .gov.co no eran accesibles desde el
 *   entorno de desarrollo). Las URL apuntan al texto oficial para la validación.
 * - Unidades: PERCENT = porcentaje (35 = 35 %); TIME_OF_DAY = minutos desde
 *   medianoche (1140 = 7:00 p. m.); COUNT = número de SMMLV; DAYS = días por año.
 */

export type LaborParameterSeed = {
  key: string;
  value: number;
  unit: "COP" | "PERCENT" | "HOURS" | "MINUTES" | "TIME_OF_DAY" | "DAYS" | "COUNT";
  validFrom: string; // AAAA-MM-DD
  validTo: string | null;
  legalSource: string;
  sourceUrl: string;
  notes?: string;
};

const SENADO = "http://www.secretariasenado.gov.co/senado/basedoc";
const CST = `${SENADO}/codigo_sustantivo_trabajo.html`;
const L2466 = `${SENADO}/ley_2466_2025.html`;
const L2101 = `${SENADO}/ley_2101_2021.html`;
const L100 = `${SENADO}/ley_0100_1993.html`;
const L1122 = `${SENADO}/ley_1122_2007.html`;
const L21 = `${SENADO}/ley_0021_1982.html`;
const L89 = `${SENADO}/ley_0089_1988.html`;
const L52 = `${SENADO}/ley_0052_1975.html`;
const ET = `${SENADO}/estatuto_tributario.html`;
const D1772 = "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=8803";
const D0159 = "https://www.cancilleria.gov.co/normograma/compilacion/docs/decreto_0159_2026.htm";

export const LABOR_PARAMETERS: LaborParameterSeed[] = [
  // ── Salario mínimo y auxilio de transporte ──
  {
    key: "SMMLV", value: 1_423_500, unit: "COP", validFrom: "2025-01-01", validTo: "2025-12-31",
    legalSource: "Decreto 1572 de 2024", sourceUrl: "https://www.mintrabajo.gov.co",
  },
  {
    key: "SMMLV", value: 1_750_905, unit: "COP", validFrom: "2026-01-01", validTo: null,
    legalSource: "Decreto 0159 de 2026 (fijación transitoria; el Decreto 1469 de 2025 fue suspendido por el Consejo de Estado)",
    sourceUrl: D0159,
    notes: "Valor transitorio mientras el Consejo de Estado decide la nulidad del Decreto 1469 de 2025. Si la sentencia cambia el valor, cargar una nueva versión.",
  },
  {
    key: "AUX_TRANSPORTE", value: 200_000, unit: "COP", validFrom: "2025-01-01", validTo: "2025-12-31",
    legalSource: "Decreto 1573 de 2024", sourceUrl: "https://www.mintrabajo.gov.co",
  },
  {
    key: "AUX_TRANSPORTE", value: 249_095, unit: "COP", validFrom: "2026-01-01", validTo: null,
    legalSource: "Decreto 1470 de 2025", sourceUrl: "https://www.mintrabajo.gov.co",
    notes: "Se paga en proporción a los días trabajados; no se paga en vacaciones, incapacidades ni licencias.",
  },
  {
    key: "AUX_TRANSPORTE_TOPE_SMMLV", value: 2, unit: "COUNT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 15 de 1959 y decreto anual de auxilio de transporte (hasta dos SMMLV)", sourceUrl: "https://www.mintrabajo.gov.co",
  },

  // ── Jornada ──
  {
    key: "JORNADA_MAX_SEMANAL", value: 44, unit: "HOURS", validFrom: "2025-07-15", validTo: "2026-07-14",
    legalSource: "Ley 2101 de 2021, art. 3 (reducción gradual)", sourceUrl: L2101,
  },
  {
    key: "JORNADA_MAX_SEMANAL", value: 42, unit: "HOURS", validFrom: "2026-07-15", validTo: null,
    legalSource: "Ley 2101 de 2021, art. 3 (reducción gradual)", sourceUrl: L2101,
  },
  {
    key: "NOCTURNA_INICIO", value: 1260, unit: "TIME_OF_DAY", validFrom: "2025-01-01", validTo: "2025-12-24",
    legalSource: "Código Sustantivo del Trabajo, art. 160 (antes de la Ley 2466 de 2025)", sourceUrl: CST,
  },
  {
    key: "NOCTURNA_INICIO", value: 1140, unit: "TIME_OF_DAY", validFrom: "2025-12-25", validTo: null,
    legalSource: "Ley 2466 de 2025 (modifica el art. 160 del CST; rige seis meses después de su promulgación)", sourceUrl: L2466,
    notes: "Algunas fuentes citan el 26 de diciembre de 2025 como primer día; validar la fecha exacta.",
  },
  {
    key: "NOCTURNA_FIN", value: 360, unit: "TIME_OF_DAY", validFrom: "2025-01-01", validTo: null,
    legalSource: "Código Sustantivo del Trabajo, art. 160", sourceUrl: CST,
  },

  // ── Recargos y horas extra ──
  {
    key: "RECARGO_NOCTURNO", value: 35, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Código Sustantivo del Trabajo, art. 168 num. 1", sourceUrl: CST,
  },
  {
    key: "HE_DIURNA", value: 25, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Código Sustantivo del Trabajo, art. 168 num. 2", sourceUrl: CST,
    notes: "Los recargos del art. 168 no se acumulan entre sí; sí se acumulan con el dominical/festivo (art. 179).",
  },
  {
    key: "HE_NOCTURNA", value: 75, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Código Sustantivo del Trabajo, art. 168 num. 3", sourceUrl: CST,
  },
  {
    key: "RECARGO_DOMINICAL_FESTIVO", value: 75, unit: "PERCENT", validFrom: "2025-01-01", validTo: "2025-06-30",
    legalSource: "Código Sustantivo del Trabajo, art. 179 (antes de la Ley 2466 de 2025)", sourceUrl: CST,
  },
  {
    key: "RECARGO_DOMINICAL_FESTIVO", value: 80, unit: "PERCENT", validFrom: "2025-07-01", validTo: "2026-06-30",
    legalSource: "Ley 2466 de 2025 (modifica el art. 179 del CST; aumento gradual)", sourceUrl: L2466,
  },
  {
    key: "RECARGO_DOMINICAL_FESTIVO", value: 90, unit: "PERCENT", validFrom: "2026-07-01", validTo: "2027-06-30",
    legalSource: "Ley 2466 de 2025 (modifica el art. 179 del CST; aumento gradual)", sourceUrl: L2466,
  },
  {
    key: "RECARGO_DOMINICAL_FESTIVO", value: 100, unit: "PERCENT", validFrom: "2027-07-01", validTo: null,
    legalSource: "Ley 2466 de 2025 (modifica el art. 179 del CST; aumento gradual)", sourceUrl: L2466,
  },

  // ── Seguridad social y parafiscales ──
  {
    key: "SALUD_EMPLEADO", value: 4, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 1122 de 2007, art. 10 (cotización total 12,5 %)", sourceUrl: L1122,
  },
  {
    key: "SALUD_EMPLEADOR", value: 8.5, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 1122 de 2007, art. 10 (cotización total 12,5 %)", sourceUrl: L1122,
    notes: "Exonerado para trabajadores que devenguen menos de 10 SMMLV si el empleador cumple el art. 114-1 del E.T.",
  },
  {
    key: "PENSION_EMPLEADO", value: 4, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 100 de 1993, art. 20 (modificado por la Ley 797 de 2003; cotización total 16 %)", sourceUrl: L100,
    notes: "No incluye el aporte al Fondo de Solidaridad Pensional (desde 4 SMMLV); Nexora lo advierte sin calcularlo.",
  },
  {
    key: "PENSION_EMPLEADOR", value: 12, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 100 de 1993, art. 20 (modificado por la Ley 797 de 2003; cotización total 16 %)", sourceUrl: L100,
  },
  {
    key: "FONDO_SOLIDARIDAD_DESDE_SMMLV", value: 4, unit: "COUNT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 100 de 1993, art. 27 (modificado por la Ley 797 de 2003, art. 8)", sourceUrl: L100,
    notes: "Desde este ingreso el trabajador aporta 1 % adicional (más en ingresos superiores). Nexora solo lo advierte.",
  },
  ...(["I", "II", "III", "IV", "V"] as const).map((c, i) => ({
    key: `ARL_CLASE_${c}`, value: [0.522, 1.044, 2.436, 4.35, 6.96][i]!, unit: "PERCENT" as const, validFrom: "2025-01-01", validTo: null,
    legalSource: "Decreto 1772 de 1994, art. 13 (compilado en el Decreto 1072 de 2015); tarifa inicial de la clase", sourceUrl: D1772,
    notes: "La ARL puede fijar una tarifa distinta dentro del rango de la clase; usar la de la póliza si se conoce.",
  })),
  {
    key: "CAJA_COMPENSACION", value: 4, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 21 de 1982, art. 12", sourceUrl: L21,
  },
  {
    key: "ICBF", value: 3, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 89 de 1988, art. 1", sourceUrl: L89,
    notes: "Exonerado con el art. 114-1 del E.T. para trabajadores que devenguen menos de 10 SMMLV.",
  },
  {
    key: "SENA", value: 2, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 21 de 1982, art. 12", sourceUrl: L21,
    notes: "Exonerado con el art. 114-1 del E.T. para trabajadores que devenguen menos de 10 SMMLV.",
  },
  {
    key: "EXONERACION_TOPE_SMMLV", value: 10, unit: "COUNT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Estatuto Tributario, art. 114-1", sourceUrl: ET,
    notes: "Aplica a sociedades y personas jurídicas declarantes de renta (y personas naturales con dos o más empleados). La empresa lo indica en Configuración.",
  },

  // ── Prestaciones sociales (provisiones) ──
  {
    key: "CESANTIAS_DIAS_ANIO", value: 30, unit: "DAYS", validFrom: "2025-01-01", validTo: null,
    legalSource: "Código Sustantivo del Trabajo, art. 249", sourceUrl: CST,
  },
  {
    key: "INT_CESANTIAS", value: 12, unit: "PERCENT", validFrom: "2025-01-01", validTo: null,
    legalSource: "Ley 52 de 1975, art. 1", sourceUrl: L52,
  },
  {
    key: "PRIMA_DIAS_ANIO", value: 30, unit: "DAYS", validFrom: "2025-01-01", validTo: null,
    legalSource: "Código Sustantivo del Trabajo, art. 306", sourceUrl: CST,
  },
  {
    key: "VACACIONES_DIAS_ANIO", value: 15, unit: "DAYS", validFrom: "2025-01-01", validTo: null,
    legalSource: "Código Sustantivo del Trabajo, art. 186 (15 días hábiles por año)", sourceUrl: CST,
  },
];
