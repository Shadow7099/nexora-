import "server-only";
import { randomUUID } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import { localDate, zonedTimeToUtc } from "@/lib/schedule";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { detectOvertime } from "@/server/overtime";
import type { Actor } from "@/server/sessions";

/**
 * Correcciones del administrador. Nunca se edita ni borra una marcación: se
 * agregan marcaciones nuevas de origen ADMIN_MANUAL, con autor y motivo
 * obligatorios (la base de datos lo exige), que quedan visibles como corrección.
 */

const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Hora inválida (HH:MM)." });
const reason = z.string().trim().min(5, { error: "Explica el motivo (mínimo 5 caracteres)." }).max(500);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export async function listSessionsToReview(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.workSession.findMany({
    where: { companyId, status: "NEEDS_REVIEW" },
    orderBy: { startAt: "desc" },
    include: { employee: { select: { firstName: true, lastName: true } }, site: { select: { name: true } } },
  });
}

/** Registra la salida olvidada de una jornada "por revisar" (o abierta). */
export async function closeSessionManually(actor: Actor, sessionId: string, input: unknown, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = z.object({ endTime: timeHHMM, nextDay: z.boolean().default(false), reason }).safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los datos.", fieldErrors(parsed.error));
  const v = parsed.data;
  if (!z.uuid().safeParse(sessionId).success) throw notFound("La jornada");
  const s = await db.workSession.findFirst({ where: { id: sessionId, companyId } });
  if (!s) throw notFound("La jornada");
  if (s.status === "CLOSED") throw new AppError("CONFLICT", "Esta jornada ya está cerrada.");
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const day = localDate(s.startAt, company.timezone);
  const endAt = zonedTimeToUtc(day, toMin(v.endTime) + (v.nextDay ? 1440 : 0), company.timezone);
  if (endAt <= s.startAt) throw new AppError("VALIDATION", "Revisa los datos.", { endTime: "La salida debe ser posterior a la entrada." });
  if (endAt > now) throw new AppError("VALIDATION", "Revisa los datos.", { endTime: "La salida no puede estar en el futuro." });
  if (endAt.getTime() - s.startAt.getTime() > 24 * 3600_000) throw new AppError("VALIDATION", "Revisa los datos.", { endTime: "Una jornada no puede superar 24 horas." });

  await db.$transaction(async (tx) => {
    const ev = await tx.attendanceEvent.create({
      data: {
        companyId, employeeId: s.employeeId, siteId: s.siteId, type: "OUT", occurredAt: endAt, source: "ADMIN_MANUAL", status: "ACCEPTED",
        verification: "ADMIN", geoStatus: "NOT_REQUIRED", createdById: actor.userId, reason: v.reason, correctsEventId: s.inEventId, idempotencyKey: `manual-${randomUUID()}`,
      },
    });
    await tx.workSession.update({ where: { id: s.id }, data: { outEventId: ev.id, endAt, status: "CLOSED", reviewNote: `Salida registrada por el administrador: ${v.reason}` } });
    await audit({ companyId, actorUserId: actor.userId, action: "attendance.manual_out", entityType: "work_session", entityId: s.id, after: { endAt: endAt.toISOString(), reason: v.reason } }, tx);
  });
  await detectOvertime(companyId, s.employeeId, day);
}

/** Agrega una jornada completa que no se marcó (p. ej. el celular se dañó). */
export async function addManualSession(actor: Actor, employeeId: string, input: unknown, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = z
    .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }), startTime: timeHHMM, endTime: timeHHMM, siteId: z.uuid({ error: "Elige una sede." }), reason })
    .safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los datos.", fieldErrors(parsed.error));
  const v = parsed.data;
  if (!z.uuid().safeParse(employeeId).success) throw notFound("El empleado");
  const [employee, site, company] = await Promise.all([
    db.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } }),
    db.site.findFirst({ where: { id: v.siteId, companyId }, select: { id: true } }),
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } }),
  ]);
  if (!employee) throw notFound("El empleado");
  if (!site) throw new AppError("VALIDATION", "Revisa los datos.", { siteId: "Sede no válida." });
  const startMin = toMin(v.startTime);
  let endMin = toMin(v.endTime);
  if (endMin <= startMin) endMin += 1440;
  const startAt = zonedTimeToUtc(v.date, startMin, company.timezone);
  const endAt = zonedTimeToUtc(v.date, endMin, company.timezone);
  if (endAt > now) throw new AppError("VALIDATION", "Revisa los datos.", { endTime: "La jornada no puede terminar en el futuro." });
  const overlap = await db.workSession.findFirst({
    where: { employeeId, OR: [{ startAt: { lt: endAt }, endAt: { gt: startAt } }, { startAt: { lt: endAt, gte: startAt }, endAt: null }] },
  });
  if (overlap) throw new AppError("CONFLICT", "Ya existe una jornada registrada en ese horario.");

  await db.$transaction(async (tx) => {
    const base = {
      companyId, employeeId, siteId: site.id, source: "ADMIN_MANUAL" as const, status: "ACCEPTED" as const, verification: "ADMIN" as const,
      geoStatus: "NOT_REQUIRED" as const, createdById: actor.userId, reason: v.reason,
    };
    const inEv = await tx.attendanceEvent.create({ data: { ...base, type: "IN", occurredAt: startAt, idempotencyKey: `manual-${randomUUID()}` } });
    const outEv = await tx.attendanceEvent.create({ data: { ...base, type: "OUT", occurredAt: endAt, idempotencyKey: `manual-${randomUUID()}` } });
    const s = await tx.workSession.create({
      data: { companyId, employeeId, siteId: site.id, inEventId: inEv.id, outEventId: outEv.id, startAt, endAt, status: "CLOSED", reviewNote: `Jornada registrada por el administrador: ${v.reason}` },
    });
    await audit({ companyId, actorUserId: actor.userId, action: "attendance.manual_session", entityType: "work_session", entityId: s.id, after: { date: v.date, start: v.startTime, end: v.endTime, reason: v.reason } }, tx);
  });
  await detectOvertime(companyId, employeeId, v.date);
}
