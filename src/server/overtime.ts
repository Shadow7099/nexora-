import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { localDate, shiftsOn } from "@/lib/schedule";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin, requireEmployee } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { loadOverrides, loadPatterns } from "@/server/schedule-data";
import type { Actor } from "@/server/sessions";

/**
 * Horas extra: tiempo registrado por encima de lo programado ese día.
 * - Se detectan solas al cerrar una jornada (y en lote para datos existentes).
 * - Por debajo de este umbral no se crea solicitud (minutos de llegada/salida normales).
 * - La decisión del administrador NUNCA cambia el tiempo registrado: solo define
 *   cuántos minutos se tratan como extra en la pre-nómina (approved_minutes).
 */
export const OVERTIME_MIN_MINUTES = 15;

const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000);

/** Recalcula las horas extra de un empleado en una fecha local. Idempotente. */
export async function detectOvertime(companyId: string, employeeId: string, workDate: string) {
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const tz = company.timezone;
  const [patterns, overrides, sessions] = await Promise.all([
    loadPatterns(companyId, [employeeId]),
    loadOverrides(companyId, workDate, workDate, [employeeId]),
    db.workSession.findMany({ where: { companyId, employeeId, status: "CLOSED" }, orderBy: { startAt: "asc" } }),
  ]);
  const daySessions = sessions.filter((s) => localDate(s.startAt, tz) === workDate);
  if (daySessions.length === 0) return null;
  const shifts = shiftsOn(patterns.get(employeeId) ?? [], workDate, tz, overrides.get(employeeId) ?? []);
  const worked = daySessions.reduce((a, s) => a + minutesBetween(s.startAt, s.endAt!), 0);
  const scheduled = shifts.reduce((a, s) => a + (s.endMin - s.startMin), 0);
  const detected = Math.max(0, worked - scheduled);
  const lastSession = daySessions.at(-1)!;
  const day = new Date(`${workDate}T00:00:00Z`);

  const existing = await db.overtimeRequest.findMany({ where: { companyId, employeeId, workDate: day }, orderBy: { createdAt: "asc" } });
  const decided = existing.filter((r) => r.status !== "PENDING").reduce((a, r) => a + r.detectedMinutes, 0);
  const pending = existing.find((r) => r.status === "PENDING");
  const remaining = detected - decided;

  if (remaining < OVERTIME_MIN_MINUTES) {
    // Si una corrección redujo el tiempo, la solicitud pendiente se ajusta o se retira.
    if (pending && remaining <= 0) await db.overtimeRequest.update({ where: { id: pending.id }, data: { status: "CANCELLED", detectedMinutes: 0 } });
    else if (pending) await db.overtimeRequest.update({ where: { id: pending.id }, data: { detectedMinutes: remaining } });
    return null;
  }
  if (pending) {
    return db.overtimeRequest.update({ where: { id: pending.id }, data: { detectedMinutes: remaining, workSessionId: lastSession.id } });
  }
  // La sesión ya puede estar ligada a una solicitud decidida: en ese caso no se liga otra vez.
  const sessionTaken = existing.some((r) => r.workSessionId === lastSession.id);
  return db.overtimeRequest.create({
    data: { companyId, employeeId, workDate: day, detectedMinutes: remaining, workSessionId: sessionTaken ? null : lastSession.id },
  });
}

/** Detección en lote (datos existentes o recálculo). */
export async function scanOvertime(companyId: string) {
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const sessions = await db.workSession.findMany({ where: { companyId, status: "CLOSED" }, select: { employeeId: true, startAt: true } });
  const keys = new Set(sessions.map((s) => `${s.employeeId}|${localDate(s.startAt, company.timezone)}`));
  let created = 0;
  for (const k of keys) {
    const [employeeId, date] = k.split("|") as [string, string];
    if (await detectOvertime(companyId, employeeId, date)) created++;
  }
  return created;
}

export async function listOvertime(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.overtimeRequest.findMany({
    where: { companyId, status: { not: "CANCELLED" } },
    orderBy: [{ status: "asc" }, { workDate: "desc" }],
    take: 100,
    include: {
      employee: { select: { firstName: true, lastName: true } },
      decidedBy: { select: { name: true } },
      workSession: { select: { startAt: true, endAt: true, site: { select: { name: true } } } },
    },
  });
}

export const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve"), approvedMinutes: z.coerce.number().int().min(1, { error: "Mínimo 1 minuto." }), note: z.string().trim().max(500).optional() }),
  z.object({ decision: z.literal("reject"), note: z.string().trim().min(3, { error: "Explica el motivo del rechazo." }).max(500) }),
]);

/** Aprueba (total o parcial) o rechaza. El tiempo registrado queda intacto. */
export async function decideOvertime(actor: Actor, id: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La solicitud");
  const r = await db.overtimeRequest.findFirst({ where: { id, companyId } });
  if (!r) throw notFound("La solicitud");
  if (r.status !== "PENDING") throw new AppError("CONFLICT", "Esta solicitud ya fue decidida.");
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los datos.", fieldErrors(parsed.error));
  const v = parsed.data;
  if (v.decision === "approve" && v.approvedMinutes > r.detectedMinutes) {
    throw new AppError("VALIDATION", "Revisa los datos.", { approvedMinutes: `No puede superar lo detectado (${r.detectedMinutes} min).` });
  }
  await db.$transaction(async (tx) => {
    await tx.overtimeRequest.update({
      where: { id: r.id },
      data: {
        status: v.decision === "approve" ? "APPROVED" : "REJECTED",
        approvedMinutes: v.decision === "approve" ? v.approvedMinutes : null,
        decisionNote: v.note || null,
        decidedById: actor.userId,
        decidedAt: new Date(),
      },
    });
    await audit(
      {
        companyId, actorUserId: actor.userId, action: v.decision === "approve" ? "overtime.approve" : "overtime.reject",
        entityType: "overtime_request", entityId: r.id,
        after: { detectedMinutes: r.detectedMinutes, approvedMinutes: v.decision === "approve" ? v.approvedMinutes : 0, note: v.note ?? null },
      },
      tx,
    );
  });
}

export async function myOvertime(actor: Actor) {
  const { companyId, employeeId } = requireEmployee(actor);
  return db.overtimeRequest.findMany({
    where: { companyId, employeeId, status: { not: "CANCELLED" } },
    orderBy: { workDate: "desc" },
    take: 50,
    select: { id: true, workDate: true, detectedMinutes: true, approvedMinutes: true, status: true, employeeNote: true, decisionNote: true },
  });
}

/** El empleado puede explicar sus horas extra mientras la solicitud está pendiente. */
export async function addOvertimeNote(actor: Actor, id: string, note: string) {
  const { companyId, employeeId } = requireEmployee(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La solicitud");
  const clean = note.trim().slice(0, 500);
  if (clean.length < 3) throw new AppError("VALIDATION", "Escribe una explicación.");
  const r = await db.overtimeRequest.findFirst({ where: { id, companyId, employeeId } });
  if (!r) throw notFound("La solicitud");
  if (r.status !== "PENDING") throw new AppError("CONFLICT", "La solicitud ya fue decidida.");
  await db.overtimeRequest.update({ where: { id }, data: { employeeNote: clean } });
}
