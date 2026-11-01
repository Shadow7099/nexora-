import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { zonedTimeToUtc } from "@/lib/schedule";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Hora inválida (HH:MM)." });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." });
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const isUuid = (v: string) => z.uuid().safeParse(v).success;

// ─────────────────────────── Plantillas de turno ───────────────────────────

export const templateSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Nombre muy corto." }).max(60),
    start: timeHHMM,
    end: timeHHMM,
    breakMinutes: z.coerce.number().int().min(0, { error: "No puede ser negativo." }).max(240, { error: "Máximo 240 min." }),
    breakPaid: z.boolean().default(false),
    color: z.enum(["blue", "violet", "amber", "indigo", "teal", "rose"]).default("blue"),
  })
  .transform((v) => {
    const startMin = toMin(v.start);
    let endMin = toMin(v.end);
    if (endMin <= startMin) endMin += 1440; // termina al día siguiente
    return { ...v, startMin, endMin };
  })
  .refine((v) => v.endMin - v.startMin > v.breakMinutes, { error: "El descanso no puede ser mayor que el turno.", path: ["breakMinutes"] });

export async function listTemplates(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.shiftTemplate.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { startMin: "asc" }],
    include: { _count: { select: { patternDays: true } } },
  });
}

export async function saveTemplate(actor: Actor, id: string | null, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const data = { name: v.name, startMin: v.startMin, endMin: v.endMin, breakMinutes: v.breakMinutes, breakPaid: v.breakPaid, color: v.color };
  try {
    return await db.$transaction(async (tx) => {
      let t;
      if (id) {
        if (!isUuid(id) || !(await tx.shiftTemplate.findFirst({ where: { id, companyId } }))) throw notFound("La plantilla");
        t = await tx.shiftTemplate.update({ where: { id }, data });
      } else {
        t = await tx.shiftTemplate.create({ data: { ...data, companyId } });
      }
      await audit({ companyId, actorUserId: actor.userId, action: id ? "schedule.template_update" : "schedule.template_create", entityType: "shift_template", entityId: t.id, after: data }, tx);
      return t;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new AppError("CONFLICT", "Revisa los datos.", { name: "Ya existe una plantilla con ese nombre." });
    throw e;
  }
}

export async function setTemplateActive(actor: Actor, id: string, active: boolean) {
  const companyId = requireCompanyAdmin(actor);
  if (!isUuid(id) || !(await db.shiftTemplate.findFirst({ where: { id, companyId } }))) throw notFound("La plantilla");
  await db.shiftTemplate.update({ where: { id }, data: { active } });
  await audit({ companyId, actorUserId: actor.userId, action: active ? "schedule.template_activate" : "schedule.template_deactivate", entityType: "shift_template", entityId: id });
}

// ─────────────────────────── Patrón del empleado ───────────────────────────

export const patternSchema = z.object({
  cycleDays: z.union([z.literal(7), z.literal(14)], { error: "El ciclo debe ser de 7 o 14 días." }),
  effectiveFrom: isoDate,
  days: z
    .array(z.object({ dayIndex: z.number().int().min(0).max(13), templateId: z.uuid(), siteId: z.uuid() }))
    .max(56, { error: "Demasiados turnos." }),
});

async function ownEmployee(companyId: string, employeeId: string) {
  if (!isUuid(employeeId)) throw notFound("El empleado");
  const e = await db.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true, firstName: true, lastName: true, defaultSiteId: true } });
  if (!e) throw notFound("El empleado");
  return e;
}

export async function getEmployeeSchedule(actor: Actor, employeeId: string) {
  const companyId = requireCompanyAdmin(actor);
  const employee = await ownEmployee(companyId, employeeId);
  const [patterns, overrides] = await Promise.all([
    db.schedulePattern.findMany({ where: { employeeId }, orderBy: { effectiveFrom: "desc" }, include: { days: true } }),
    db.scheduledShift.findMany({
      where: { employeeId, workDate: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      orderBy: [{ workDate: "asc" }, { startAt: "asc" }],
      include: { site: { select: { name: true } }, template: { select: { name: true } } },
    }),
  ]);
  return { employee, patterns, overrides };
}

/**
 * Nuevo horario a partir de una fecha. El patrón anterior queda vigente hasta el
 * día anterior (los horarios pasados no cambian, porque la asistencia y la
 * pre-nómina ya los usaron). Los patrones que empezaban después se reemplazan.
 */
export async function setPattern(actor: Actor, employeeId: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const employee = await ownEmployee(companyId, employeeId);
  const parsed = patternSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa el horario.", fieldErrors(parsed.error));
  const v = parsed.data;
  if (v.days.some((x) => x.dayIndex >= v.cycleDays)) throw new AppError("VALIDATION", "Hay turnos fuera del ciclo.");

  const [templates, sites] = await Promise.all([
    db.shiftTemplate.findMany({ where: { companyId, id: { in: [...new Set(v.days.map((x) => x.templateId))] }, active: true }, select: { id: true } }),
    db.site.findMany({ where: { companyId, id: { in: [...new Set(v.days.map((x) => x.siteId))] }, active: true }, select: { id: true } }),
  ]);
  if (templates.length !== new Set(v.days.map((x) => x.templateId)).size) throw new AppError("VALIDATION", "Alguna plantilla de turno no existe o está inactiva.");
  if (sites.length !== new Set(v.days.map((x) => x.siteId)).size) throw new AppError("VALIDATION", "Alguna sede no existe o está inactiva.");

  const from = d(v.effectiveFrom);
  await db.$transaction(async (tx) => {
    await tx.schedulePattern.deleteMany({ where: { employeeId: employee.id, effectiveFrom: { gte: from } } });
    await tx.schedulePattern.updateMany({
      where: { employeeId: employee.id, effectiveFrom: { lt: from }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
      data: { effectiveTo: new Date(from.getTime() - 86_400_000) },
    });
    const p = await tx.schedulePattern.create({
      data: {
        companyId,
        employeeId: employee.id,
        name: v.cycleDays === 14 ? "Rotativo de 14 días" : "Semanal",
        cycleDays: v.cycleDays,
        anchorDate: from,
        effectiveFrom: from,
        days: { create: v.days },
      },
    });
    await audit({ companyId, actorUserId: actor.userId, action: "schedule.pattern_set", entityType: "schedule_pattern", entityId: p.id, after: { employeeId: employee.id, from: v.effectiveFrom, shifts: v.days.length, cycleDays: v.cycleDays } }, tx);
  });
}

// ─────────────────────────── Cambios puntuales ───────────────────────────

export const overrideSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("rest"), date: isoDate, note: z.string().trim().max(200).optional() }),
  z.object({ kind: z.literal("shift"), date: isoDate, templateId: z.uuid({ error: "Elige un turno." }), siteId: z.uuid({ error: "Elige una sede." }), note: z.string().trim().max(200).optional() }),
]);

/** Reemplaza el horario de un día (otro turno, otra sede o descanso). */
export async function setOverride(actor: Actor, employeeId: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const employee = await ownEmployee(companyId, employeeId);
  const parsed = overrideSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los datos.", fieldErrors(parsed.error));
  const v = parsed.data;
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const tz = company.timezone;

  let row;
  if (v.kind === "shift") {
    const [t, site] = await Promise.all([
      db.shiftTemplate.findFirst({ where: { id: v.templateId, companyId, active: true } }),
      db.site.findFirst({ where: { id: v.siteId, companyId, active: true }, select: { id: true } }),
    ]);
    if (!t) throw new AppError("VALIDATION", "Revisa los datos.", { templateId: "Turno no válido." });
    if (!site) throw new AppError("VALIDATION", "Revisa los datos.", { siteId: "Sede no válida." });
    row = {
      siteId: site.id, templateId: t.id, status: "PLANNED" as const,
      startAt: zonedTimeToUtc(v.date, t.startMin, tz), endAt: zonedTimeToUtc(v.date, t.endMin, tz),
      breakMinutes: t.breakMinutes, breakPaid: t.breakPaid,
    };
  } else {
    // Marcador de descanso: un registro CANCELLED de un minuto (la restricción exige fin > inicio).
    const siteId = employee.defaultSiteId ?? (await db.site.findFirst({ where: { companyId }, select: { id: true } }))!.id;
    row = { siteId, templateId: null, status: "CANCELLED" as const, startAt: zonedTimeToUtc(v.date, 0, tz), endAt: zonedTimeToUtc(v.date, 1, tz), breakMinutes: 0, breakPaid: false };
  }

  await db.$transaction(async (tx) => {
    await tx.scheduledShift.deleteMany({ where: { employeeId: employee.id, workDate: d(v.date) } });
    await tx.scheduledShift.create({ data: { ...row, companyId, employeeId: employee.id, workDate: d(v.date), note: v.note || null } });
    await audit({ companyId, actorUserId: actor.userId, action: "schedule.override_set", entityType: "employee", entityId: employee.id, after: { date: v.date, kind: v.kind } }, tx);
  });
}

/** Quita el cambio de un día: vuelve a aplicar el patrón. */
export async function clearOverride(actor: Actor, employeeId: string, date: string) {
  const companyId = requireCompanyAdmin(actor);
  const employee = await ownEmployee(companyId, employeeId);
  if (!isoDate.safeParse(date).success) throw new AppError("VALIDATION", "Fecha inválida.");
  await db.$transaction(async (tx) => {
    await tx.scheduledShift.deleteMany({ where: { employeeId: employee.id, workDate: d(date) } });
    await audit({ companyId, actorUserId: actor.userId, action: "schedule.override_clear", entityType: "employee", entityId: employee.id, after: { date } }, tx);
  });
}
