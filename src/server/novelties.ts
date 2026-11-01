import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { fieldErrors } from "@/lib/validation";
import type { NoveltyType } from "@/generated/prisma/enums";
import { audit } from "@/server/audit";
import { requireCompanyAdmin, requireEmployee } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/** Novedades: vacaciones, incapacidades, licencias, permisos y ausencias. */

export const noveltyLabel: Record<NoveltyType, string> = {
  VACACIONES: "Vacaciones",
  INCAPACIDAD_COMUN: "Incapacidad (enfermedad general)",
  INCAPACIDAD_LABORAL: "Incapacidad (accidente o enfermedad laboral)",
  LICENCIA_MATERNIDAD: "Licencia de maternidad",
  LICENCIA_PATERNIDAD: "Licencia de paternidad",
  LICENCIA_REMUNERADA: "Licencia remunerada",
  LICENCIA_NO_REMUNERADA: "Licencia no remunerada",
  LICENCIA_LUTO: "Licencia de luto",
  CALAMIDAD_DOMESTICA: "Calamidad doméstica",
  PERMISO: "Permiso",
  AUSENCIA_INJUSTIFICADA: "Ausencia injustificada",
  SUSPENSION: "Suspensión",
};

/** Tipos que solo registra el administrador (no los solicita el empleado). */
const ADMIN_ONLY: NoveltyType[] = ["AUSENCIA_INJUSTIFICADA", "SUSPENSION"];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." });
export const noveltySchema = z
  .object({
    type: z.enum(Object.keys(noveltyLabel) as [NoveltyType, ...NoveltyType[]], { error: "Elige el tipo." }),
    startDate: isoDate,
    endDate: isoDate,
    hours: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0.5).max(12).optional()),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { error: "La fecha final no puede ser anterior a la inicial.", path: ["endDate"] })
  .refine((v) => v.hours == null || v.startDate === v.endDate, { error: "Un permiso por horas es de un solo día.", path: ["hours"] });

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

async function assertNoOverlap(employeeId: string, start: string, end: string) {
  const overlap = await db.novelty.findFirst({
    where: { employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: d(end) }, endDate: { gte: d(start) } },
  });
  if (overlap) throw new AppError("CONFLICT", `Ya hay una novedad (${noveltyLabel[overlap.type]}) en esas fechas.`);
}

function parse(input: unknown) {
  const parsed = noveltySchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  return parsed.data;
}

/** El empleado solicita una novedad; queda pendiente. */
export async function requestNovelty(actor: Actor, input: unknown) {
  const { companyId, employeeId } = requireEmployee(actor);
  const v = parse(input);
  if (ADMIN_ONLY.includes(v.type)) throw new AppError("VALIDATION", "Ese tipo de novedad lo registra el administrador.");
  await assertNoOverlap(employeeId, v.startDate, v.endDate);
  const n = await db.novelty.create({
    data: { companyId, employeeId, type: v.type, startDate: d(v.startDate), endDate: d(v.endDate), hours: v.hours ?? null, note: v.note || null, requestedBy: actor.userId },
  });
  await audit({ companyId, actorUserId: actor.userId, action: "novelty.request", entityType: "novelty", entityId: n.id, after: { type: v.type, from: v.startDate, to: v.endDate } });
  return n;
}

/** El administrador registra una novedad ya aprobada (p. ej. una incapacidad que le enviaron). */
export async function registerNovelty(actor: Actor, employeeId: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(employeeId).success || !(await db.employee.findFirst({ where: { id: employeeId, companyId } }))) throw notFound("El empleado");
  const v = parse(input);
  await assertNoOverlap(employeeId, v.startDate, v.endDate);
  const n = await db.novelty.create({
    data: {
      companyId, employeeId, type: v.type, startDate: d(v.startDate), endDate: d(v.endDate), hours: v.hours ?? null, note: v.note || null,
      requestedBy: actor.userId, status: "APPROVED", decidedById: actor.userId, decidedAt: new Date(), decisionNote: "Registrada por el administrador",
    },
  });
  await audit({ companyId, actorUserId: actor.userId, action: "novelty.register", entityType: "novelty", entityId: n.id, after: { employeeId, type: v.type, from: v.startDate, to: v.endDate } });
  return n;
}

export async function decideNovelty(actor: Actor, id: string, decision: "approve" | "reject", note?: string) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La novedad");
  const n = await db.novelty.findFirst({ where: { id, companyId } });
  if (!n) throw notFound("La novedad");
  if (n.status !== "PENDING") throw new AppError("CONFLICT", "Esta novedad ya fue decidida.");
  if (decision === "reject" && (!note || note.trim().length < 3)) throw new AppError("VALIDATION", "Explica el motivo del rechazo.", { note: "Explica el motivo del rechazo." });
  await db.$transaction(async (tx) => {
    await tx.novelty.update({
      where: { id },
      data: { status: decision === "approve" ? "APPROVED" : "REJECTED", decidedById: actor.userId, decidedAt: new Date(), decisionNote: note?.trim() || null },
    });
    await audit({ companyId, actorUserId: actor.userId, action: decision === "approve" ? "novelty.approve" : "novelty.reject", entityType: "novelty", entityId: id, after: { note: note ?? null } }, tx);
  });
}

/** El empleado retira una solicitud que aún no se ha decidido. */
export async function cancelNovelty(actor: Actor, id: string) {
  const { companyId, employeeId } = requireEmployee(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La novedad");
  const n = await db.novelty.findFirst({ where: { id, companyId, employeeId } });
  if (!n) throw notFound("La novedad");
  if (n.status !== "PENDING") throw new AppError("CONFLICT", "Solo se pueden retirar solicitudes pendientes.");
  await db.novelty.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit({ companyId, actorUserId: actor.userId, action: "novelty.cancel", entityType: "novelty", entityId: id });
}

const listInclude = { employee: { select: { firstName: true, lastName: true } }, decidedBy: { select: { name: true } } } as const;

export async function listNovelties(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.novelty.findMany({
    where: { companyId, status: { not: "CANCELLED" } },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 100,
    include: listInclude,
  });
}

export async function myNovelties(actor: Actor) {
  const { companyId, employeeId } = requireEmployee(actor);
  return db.novelty.findMany({ where: { companyId, employeeId }, orderBy: { startDate: "desc" }, take: 50, include: listInclude });
}

/** Novedades aprobadas que cubren una fecha (para la asistencia del día). */
export async function approvedNoveltiesOn(companyId: string, date: string) {
  return db.novelty.findMany({ where: { companyId, status: "APPROVED", startDate: { lte: d(date) }, endDate: { gte: d(date) } } });
}
