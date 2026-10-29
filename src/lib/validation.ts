import * as z from "zod";

export const PASSWORD_MIN = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, { error: `Mínimo ${PASSWORD_MIN} caracteres.` })
  .max(128, { error: "Máximo 128 caracteres." })
  .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, { error: "Incluye al menos una letra." })
  .regex(/[0-9]/, { error: "Incluye al menos un número." });

export const loginSchema = z.object({
  email: z.email({ error: "Escribe un correo válido." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Escribe tu contraseña." }).max(128),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." });
const money = z.coerce.number({ error: "Valor inválido." }).positive({ error: "Debe ser mayor que cero." }).max(1_000_000_000);

export const employeeSchema = z.object({
  firstName: z.string().trim().min(2, { error: "Nombre muy corto." }).max(60),
  lastName: z.string().trim().min(2, { error: "Apellido muy corto." }).max(80),
  email: z.email({ error: "Correo inválido." }).trim().toLowerCase(),
  documentType: z.enum(["CC", "CE", "PPT", "PASAPORTE", "TI"], { error: "Tipo de documento inválido." }),
  documentNumber: z.string().trim().regex(/^[A-Za-z0-9-]{4,20}$/, { error: "Documento inválido (4 a 20 caracteres, sin espacios)." }),
  phone: z.string().trim().regex(/^[0-9+ ]{7,15}$/, { error: "Teléfono inválido." }).optional().or(z.literal("")),
  position: z.string().trim().min(2, { error: "Escribe el cargo." }).max(80),
  defaultSiteId: z.uuid({ error: "Elige una sede." }),
  hireDate: isoDate,
});

export const contractSchema = z.object({
  contractType: z.enum(["INDEFINIDO", "FIJO", "OBRA_LABOR", "APRENDIZAJE", "PRESTACION_SERVICIOS"], { error: "Tipo de contrato inválido." }),
  salaryType: z.enum(["ORDINARIO", "INTEGRAL"]).default("ORDINARIO"),
  monthlySalary: money,
  weeklyHours: z.coerce.number({ error: "Valor inválido." }).min(1, { error: "Mínimo 1 hora." }).max(60, { error: "Máximo 60 horas." }),
  payFrequency: z.enum(["QUINCENAL", "MENSUAL"], { error: "Elige la frecuencia de pago." }),
  arlRiskClass: z.enum(["I", "II", "III", "IV", "V"], { error: "Clase de riesgo inválida." }),
  startDate: isoDate,
});

export const companySettingsSchema = z.object({
  lateToleranceMin: z.coerce.number().int().min(0, { error: "No puede ser negativa." }).max(60, { error: "Máximo 60 minutos." }),
  geoMaxAccuracyM: z.coerce.number().int().min(10, { error: "Mínimo 10 m." }).max(1000, { error: "Máximo 1000 m." }),
  requireDeviceBinding: z.boolean(),
});

/** Convierte los errores de Zod en { campo: primer mensaje }. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
