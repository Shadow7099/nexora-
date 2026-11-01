/** Descripción legible de cada clave (pantalla de parámetros y líneas de cálculo). */
export const PARAMETER_INFO: Record<string, { label: string; group: string }> = {
  SMMLV: { label: "Salario mínimo mensual (SMMLV)", group: "Salario y auxilio" },
  AUX_TRANSPORTE: { label: "Auxilio de transporte mensual", group: "Salario y auxilio" },
  AUX_TRANSPORTE_TOPE_SMMLV: { label: "Auxilio de transporte: hasta (en SMMLV)", group: "Salario y auxilio" },
  JORNADA_MAX_SEMANAL: { label: "Jornada máxima semanal", group: "Jornada" },
  NOCTURNA_INICIO: { label: "Inicio del trabajo nocturno", group: "Jornada" },
  NOCTURNA_FIN: { label: "Fin del trabajo nocturno", group: "Jornada" },
  RECARGO_NOCTURNO: { label: "Recargo nocturno", group: "Recargos y horas extra" },
  RECARGO_DOMINICAL_FESTIVO: { label: "Recargo dominical y festivo", group: "Recargos y horas extra" },
  HE_DIURNA: { label: "Hora extra diurna (recargo)", group: "Recargos y horas extra" },
  HE_NOCTURNA: { label: "Hora extra nocturna (recargo)", group: "Recargos y horas extra" },
  SALUD_EMPLEADO: { label: "Salud a cargo del trabajador", group: "Seguridad social y parafiscales" },
  PENSION_EMPLEADO: { label: "Pensión a cargo del trabajador", group: "Seguridad social y parafiscales" },
  SALUD_EMPLEADOR: { label: "Salud a cargo del empleador", group: "Seguridad social y parafiscales" },
  PENSION_EMPLEADOR: { label: "Pensión a cargo del empleador", group: "Seguridad social y parafiscales" },
  ARL_CLASE_I: { label: "ARL riesgo I (tarifa inicial)", group: "Seguridad social y parafiscales" },
  ARL_CLASE_II: { label: "ARL riesgo II (tarifa inicial)", group: "Seguridad social y parafiscales" },
  ARL_CLASE_III: { label: "ARL riesgo III (tarifa inicial)", group: "Seguridad social y parafiscales" },
  ARL_CLASE_IV: { label: "ARL riesgo IV (tarifa inicial)", group: "Seguridad social y parafiscales" },
  ARL_CLASE_V: { label: "ARL riesgo V (tarifa inicial)", group: "Seguridad social y parafiscales" },
  CAJA_COMPENSACION: { label: "Caja de compensación familiar", group: "Seguridad social y parafiscales" },
  ICBF: { label: "ICBF", group: "Seguridad social y parafiscales" },
  SENA: { label: "SENA", group: "Seguridad social y parafiscales" },
  FONDO_SOLIDARIDAD_DESDE_SMMLV: { label: "Fondo de Solidaridad Pensional: desde (en SMMLV)", group: "Seguridad social y parafiscales" },
  EXONERACION_TOPE_SMMLV: { label: "Exoneración art. 114-1 E.T.: trabajadores que devenguen menos de (SMMLV)", group: "Seguridad social y parafiscales" },
  CESANTIAS_DIAS_ANIO: { label: "Cesantías (días de salario por año)", group: "Prestaciones sociales" },
  INT_CESANTIAS: { label: "Intereses sobre cesantías (anual)", group: "Prestaciones sociales" },
  PRIMA_DIAS_ANIO: { label: "Prima de servicios (días de salario por año)", group: "Prestaciones sociales" },
  VACACIONES_DIAS_ANIO: { label: "Vacaciones (días hábiles por año)", group: "Prestaciones sociales" },
};

export const parameterLabel = (key: string) => PARAMETER_INFO[key]?.label ?? key;

/** Valor legible según su unidad: $ 1.750.905 · 35 % · 7:00 p. m. · 42 h · 15 días · 2 SMMLV. */
export function formatParamValue(unit: string, value: number) {
  const n = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 4 });
  switch (unit) {
    case "COP":
      return `$ ${n(value)}`;
    case "PERCENT":
      return `${n(value)} %`;
    case "TIME_OF_DAY": {
      const h = Math.floor(value / 60) % 24;
      const m = String(value % 60).padStart(2, "0");
      return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "a. m." : "p. m."}`;
    }
    case "HOURS":
      return `${n(value)} h`;
    case "MINUTES":
      return `${n(value)} min`;
    case "DAYS":
      return `${n(value)} días`;
    case "COUNT":
      return `${n(value)} SMMLV`;
    default:
      return n(value);
  }
}
