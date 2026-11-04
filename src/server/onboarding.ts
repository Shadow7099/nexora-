import "server-only";
import { randomBytes } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { DEFAULT_PLAN, findPlan, PLAN_CODES, trialEndDate } from "@/lib/plans";
import { localDate } from "@/lib/schedule";
import { fieldErrors, passwordSchema } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { createEmployee } from "@/server/employees";
import { AppError } from "@/server/errors";
import { saveTemplate, setPattern } from "@/server/schedules";
import { CONSENT_POLICY_VERSION, createSession, hitPublicLimit, type Actor } from "@/server/sessions";

/**
 * Autoregistro de empresas y asistente de configuración inicial.
 *
 * Un cliente nuevo crea su empresa y su cuenta de administrador sin pasar por
 * Nexora; luego el asistente lo lleva por sede → turnos → empleados → horarios.
 * Cada paso reutiliza la misma lógica (y las mismas validaciones y auditoría)
 * que las pantallas normales del panel.
 */

/** Registros permitidos desde una misma red por hora (frena el abuso del formulario público). */
export const SIGNUP_PER_IP_PER_HOUR = 5;

const optionalText = (max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(max).optional());

export const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, { error: "Escribe el nombre de la empresa." }).max(120),
    nit: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().regex(/^[0-9.\-\s]{5,20}$/, { error: "NIT inválido (solo números, puntos y guion)." }).optional()),
    legalName: optionalText(160),
    plan: z.preprocess((v) => (v === "" || v == null ? DEFAULT_PLAN : v), z.enum(PLAN_CODES, { error: "Elige un plan." })),
    adminName: z.string().trim().min(3, { error: "Escribe tu nombre completo." }).max(120),
    adminEmail: z.email({ error: "Correo inválido." }).trim().toLowerCase().max(160),
    password: passwordSchema,
    confirm: z.string(),
    accept: z.literal("on", { error: "Debes aceptar la autorización de datos y los términos." }),
  })
  .refine((v) => v.password === v.confirm, { error: "Las contraseñas no coinciden.", path: ["confirm"] })
  .refine((v) => !v.password.toLowerCase().includes(v.adminEmail.split("@")[0]!.toLowerCase()), { error: "No uses tu correo dentro de la contraseña.", path: ["password"] });

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "empresa";

/**
 * Crea la empresa en prueba gratuita (1 mes) con los límites del plan elegido, su administrador con la contraseña que eligió y
 * su autorización de datos, e inicia sesión. Devuelve el token de la sesión.
 */
export async function registerCompany(input: unknown, ctx: { ip?: string | null; userAgent?: string | null } = {}) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;

  if (await hitPublicLimit("signup", ctx.ip ?? null, SIGNUP_PER_IP_PER_HOUR, 60)) {
    throw new AppError("LIMIT", "Se crearon demasiadas cuentas desde esta red. Intenta de nuevo en una hora.");
  }
  if (await db.user.findFirst({ where: { email: { equals: v.adminEmail, mode: "insensitive" } }, select: { id: true } })) {
    throw new AppError("CONFLICT", "Ese correo ya tiene una cuenta en Nexora.", { adminEmail: "Ese correo ya está registrado. Ingresa con él o usa otro." });
  }

  const plan = findPlan(v.plan)!;
  const passwordHash = await hashPassword(v.password);
  const { company, admin } = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: v.companyName,
        legalName: v.legalName ?? null,
        nit: v.nit ?? null,
        slug: `${slugify(v.companyName)}-${randomBytes(3).toString("hex")}`,
        status: "TRIAL",
        selfSignup: true,
        planCode: plan.code,
        maxEmployees: plan.maxEmployees,
        maxSites: plan.maxSites,
        trialEndsAt: trialEndDate(new Date()),
      },
    });
    const admin = await tx.user.create({
      data: { companyId: company.id, email: v.adminEmail, name: v.adminName, passwordHash, role: "COMPANY_ADMIN", lastLoginAt: new Date() },
    });
    await tx.dataConsent.create({ data: { userId: admin.id, policyVersion: CONSENT_POLICY_VERSION, userAgent: ctx.userAgent?.slice(0, 300) } });
    await audit(
      { companyId: company.id, actorUserId: admin.id, action: "company.self_signup", entityType: "company", entityId: company.id, after: { name: v.companyName, admin: v.adminEmail, plan: plan.code }, userAgent: ctx.userAgent },
      tx,
    );
    return { company, admin };
  });

  const session = await createSession(admin.id, "COMPANY_ADMIN", ctx.userAgent);
  return { companyId: company.id, ...session };
}

// ─────────────────────────── Estado del asistente ───────────────────────────

export type OnboardingStep = "sede" | "turnos" | "empleados" | "horarios" | "listo";
export const ONBOARDING_STEPS: { key: OnboardingStep; title: string; text: string }[] = [
  { key: "sede", title: "Tu sede", text: "Dónde trabaja tu equipo. Genera el QR para marcar." },
  { key: "turnos", title: "Turnos", text: "Las jornadas que usa tu empresa (diurno, nocturno…)." },
  { key: "empleados", title: "Empleados", text: "Crea sus cuentas de una vez, con contraseña temporal." },
  { key: "horarios", title: "Horarios", text: "Asigna a cada empleado sus días y su turno." },
  { key: "listo", title: "Listo", text: "Imprime el QR y empieza a marcar asistencia." },
];

export async function getOnboardingStatus(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const today = new Date(`${localDate(new Date())}T00:00:00.000Z`);
  const [company, sites, templates, employees, withSchedule] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, onboardingCompletedAt: true, maxEmployees: true, maxSites: true, selfSignup: true } }),
    db.site.findMany({ where: { companyId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, qrCodes: { where: { revokedAt: null }, select: { id: true }, take: 1 } } }),
    db.shiftTemplate.findMany({ where: { companyId, active: true }, orderBy: { startMin: "asc" }, select: { id: true, name: true, startMin: true, endMin: true, breakMinutes: true } }),
    db.employee.count({ where: { companyId, status: "ACTIVE" } }),
    db.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      orderBy: { firstName: "asc" },
      select: {
        id: true, firstName: true, lastName: true, position: true, defaultSiteId: true,
        patterns: { where: { OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }] }, select: { id: true }, take: 1 },
      },
    }),
  ]);
  const done: Record<OnboardingStep, boolean> = {
    sede: sites.length > 0,
    turnos: templates.length > 0,
    empleados: employees > 0,
    horarios: employees > 0 && withSchedule.every((e) => e.patterns.length > 0),
    listo: company.onboardingCompletedAt != null,
  };
  const next = ONBOARDING_STEPS.find((s) => !done[s.key])?.key ?? "listo";
  return {
    company,
    sites,
    templates,
    employees: withSchedule.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, position: e.position, defaultSiteId: e.defaultSiteId, hasSchedule: e.patterns.length > 0 })),
    done,
    next,
    completed: company.onboardingCompletedAt != null,
  };
}

/** ¿Debe ver el asistente? (empresa sin configuración inicial terminada). */
export async function needsOnboarding(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const c = await db.company.findUnique({ where: { id: companyId }, select: { onboardingCompletedAt: true } });
  return c != null && c.onboardingCompletedAt == null;
}

/** Termina (u omite) el asistente. Desde ahí el panel abre en el resumen. */
export async function completeOnboarding(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const r = await db.company.updateMany({ where: { id: companyId, onboardingCompletedAt: null }, data: { onboardingCompletedAt: new Date() } });
  if (r.count > 0) await audit({ companyId, actorUserId: actor.userId, action: "company.onboarding_complete", entityType: "company", entityId: companyId });
}

// ─────────────────────────── Turnos sugeridos ───────────────────────────

/** Jornadas habituales en pymes colombianas; el administrador elige las que usa. */
export const SHIFT_PRESETS = {
  diurno: { name: "Diurno", start: "08:00", end: "17:00", breakMinutes: 60, color: "blue" },
  manana: { name: "Mañana", start: "06:00", end: "14:00", breakMinutes: 30, color: "amber" },
  tarde: { name: "Tarde", start: "14:00", end: "22:00", breakMinutes: 30, color: "violet" },
  nocturno: { name: "Nocturno", start: "22:00", end: "06:00", breakMinutes: 30, color: "indigo" },
  sabado: { name: "Medio día sábado", start: "08:00", end: "12:00", breakMinutes: 0, color: "teal" },
} as const;
export type ShiftPresetKey = keyof typeof SHIFT_PRESETS;

const presetKeys = z.array(z.enum(Object.keys(SHIFT_PRESETS) as [ShiftPresetKey, ...ShiftPresetKey[]])).min(1, { error: "Elige al menos un turno." });

/** Crea los turnos sugeridos elegidos (omite los que ya existen con ese nombre). */
export async function createPresetTemplates(actor: Actor, keys: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = presetKeys.safeParse(keys);
  if (!parsed.success) throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Elige al menos un turno.");
  const existing = new Set((await db.shiftTemplate.findMany({ where: { companyId }, select: { name: true } })).map((t) => t.name.toLowerCase()));
  let created = 0;
  for (const key of new Set(parsed.data)) {
    const p = SHIFT_PRESETS[key];
    if (existing.has(p.name.toLowerCase())) continue;
    await saveTemplate(actor, null, { ...p, breakPaid: false });
    created++;
  }
  return { created };
}

// ─────────────────────────── Empleados en lote ───────────────────────────

export const MAX_BULK_EMPLOYEES = 100;

export const bulkDefaultsSchema = z.object({
  defaultSiteId: z.uuid({ error: "Elige la sede." }),
  contractType: z.enum(["INDEFINIDO", "FIJO", "OBRA_LABOR", "APRENDIZAJE", "PRESTACION_SERVICIOS"]).default("INDEFINIDO"),
  payFrequency: z.enum(["QUINCENAL", "MENSUAL"]).default("QUINCENAL"),
  weeklyHours: z.coerce.number().min(1).max(60).default(42),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }),
});

const COLUMNS = ["firstName", "lastName", "documentNumber", "email", "position", "monthlySalary", "phone"] as const;

/**
 * Lee una lista pegada desde Excel o escrita a mano: una persona por línea,
 * columnas separadas por tabulador, punto y coma o coma, en este orden:
 * Nombres; Apellidos; Documento; Correo; Cargo; Salario; Celular (opcional).
 * La primera línea se ignora si es un encabezado.
 */
export function parseEmployeeLines(text: string) {
  const lines = text.split(/\r?\n/).map((l, i) => ({ line: i + 1, raw: l.trim() })).filter((l) => l.raw.length > 0);
  if (lines[0] && /correo|e-?mail/i.test(lines[0].raw) && !/@/.test(lines[0].raw)) lines.shift();
  return lines.map(({ line, raw }) => {
    const sep = raw.includes("\t") ? "\t" : raw.includes(";") ? ";" : ",";
    const cells = raw.split(sep).map((c) => c.trim());
    const row: Record<string, string> = {};
    COLUMNS.forEach((k, i) => (row[k] = cells[i] ?? ""));
    // Salario escrito como "1.750.905" o "$ 1,750,905": solo dígitos.
    row.monthlySalary = row.monthlySalary!.replace(/[^\d]/g, "");
    row.documentNumber = row.documentNumber!.replace(/[.\s]/g, "");
    return { line, raw, row };
  });
}

export type BulkResult = {
  created: { line: number; name: string; email: string; password: string }[];
  failed: { line: number; text: string; error: string }[];
};

/** Crea varios empleados con sus cuentas. Cada línea es independiente: un error no detiene las demás. */
export async function createEmployeesBulk(actor: Actor, text: unknown, defaults: unknown): Promise<BulkResult> {
  requireCompanyAdmin(actor);
  const d = bulkDefaultsSchema.safeParse(defaults);
  if (!d.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(d.error));
  const rows = parseEmployeeLines(typeof text === "string" ? text : "");
  if (rows.length === 0) throw new AppError("VALIDATION", "Revisa los campos marcados.", { lines: "Escribe al menos un empleado." });
  if (rows.length > MAX_BULK_EMPLOYEES) throw new AppError("VALIDATION", "Revisa los campos marcados.", { lines: `Máximo ${MAX_BULK_EMPLOYEES} empleados por vez.` });

  const result: BulkResult = { created: [], failed: [] };
  for (const { line, raw, row } of rows) {
    try {
      const r = await createEmployee(actor, {
        ...row,
        documentType: "CC",
        defaultSiteId: d.data.defaultSiteId,
        hireDate: d.data.hireDate,
        startDate: d.data.hireDate,
        contractType: d.data.contractType,
        salaryType: "ORDINARIO",
        payFrequency: d.data.payFrequency,
        weeklyHours: String(d.data.weeklyHours),
        arlRiskClass: "I",
      });
      result.created.push({ line, name: `${row.firstName} ${row.lastName}`, email: row.email!.toLowerCase(), password: r.temporaryPassword });
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      const detail = e.fieldErrors ? Object.entries(e.fieldErrors).map(([k, m]) => `${FIELD_LABEL[k] ?? k}: ${m}`).join(" · ") : e.message;
      result.failed.push({ line, text: raw, error: detail });
      if (e.code === "LIMIT") break; // el plan ya no admite más
    }
  }
  return result;
}

const FIELD_LABEL: Record<string, string> = {
  firstName: "Nombres", lastName: "Apellidos", documentNumber: "Documento", email: "Correo", position: "Cargo", monthlySalary: "Salario", phone: "Celular",
};

// ─────────────────────────── Horario para varios ───────────────────────────

export const bulkScheduleSchema = z.object({
  templateId: z.uuid({ error: "Elige el turno." }),
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1, { error: "Elige al menos un día." }),
  employeeIds: z.array(z.uuid()).min(1, { error: "Elige al menos un empleado." }).max(500),
});

/**
 * Asigna el mismo horario semanal (un turno, ciertos días) a varios empleados,
 * cada uno en su sede habitual, vigente desde hoy. Usa la misma regla que el
 * editor de horarios: el patrón anterior queda cerrado el día anterior.
 */
export async function assignWeeklySchedule(actor: Actor, input: unknown, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = bulkScheduleSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const employees = await db.employee.findMany({ where: { companyId, id: { in: v.employeeIds }, status: "ACTIVE" }, select: { id: true, defaultSiteId: true } });
  if (employees.length !== new Set(v.employeeIds).size) throw new AppError("VALIDATION", "Algún empleado no existe o está inactivo.");
  const fallbackSite = await db.site.findFirst({ where: { companyId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true } });

  const from = localDate(now);
  // dayIndex 0 = el día de inicio; se traduce cada día ISO (1 = lunes) a su posición en el ciclo.
  const startWeekday = ((new Date(`${from}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const indexes = [...new Set(v.weekdays)].map((w) => (w - startWeekday + 7) % 7);

  for (const e of employees) {
    const siteId = e.defaultSiteId ?? fallbackSite?.id;
    if (!siteId) throw new AppError("VALIDATION", "Primero crea una sede.");
    await setPattern(actor, e.id, { cycleDays: 7, effectiveFrom: from, days: indexes.map((dayIndex) => ({ dayIndex, templateId: v.templateId, siteId })) });
  }
  return { assigned: employees.length, from };
}

// ─────────────────────────── Plan y prueba gratuita ───────────────────────────

/** Plan y prueba de la empresa del administrador, para el aviso del panel. Null si no está en prueba. */
export async function getTrialStatus(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const c = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { status: true, planCode: true, maxEmployees: true, trialEndsAt: true } });
  if (c.status !== "TRIAL" || !c.trialEndsAt) return null;
  return { planCode: c.planCode, maxEmployees: c.maxEmployees, endsAt: c.trialEndsAt, expired: c.trialEndsAt.getTime() <= Date.now() };
}
