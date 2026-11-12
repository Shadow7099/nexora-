import "server-only";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import * as z from "zod";
import { db } from "@/lib/db";
import { distanceMeters, evaluateLocation, type GeoInput } from "@/lib/geo";
import { currentOrNextShift, localDate, shiftsOn, zonedTimeToUtc } from "@/lib/schedule";
import { Prisma } from "@/generated/prisma/client";
import type { AttemptReason } from "@/generated/prisma/enums";
import { requireCompanyAdmin, requireEmployee } from "@/server/authz";
import { findBinding, isPasskeyExempt, relinkableBinding } from "@/server/devices";
import { passkeysForBinding, verifyPasskeyAssertion, type RelyingParty } from "@/server/passkeys";
import { holidayOn } from "@/lib/holidays";
import { approvedNoveltiesOn, noveltyLabel } from "@/server/novelties";
import { detectOvertime } from "@/server/overtime";
import { loadOverrides, loadPatterns, shiftIsoDays } from "@/server/schedule-data";
import type { Actor } from "@/server/sessions";

/** Una jornada abierta más de este tiempo se considera olvidada y pasa a revisión. */
export const STALE_SESSION_HOURS = 16;
/** Dos marcaciones del mismo empleado separadas por menos de esto se consideran duplicadas. */
export const MIN_SECONDS_BETWEEN_PUNCHES = 60;

const reasonMessage: Record<AttemptReason, string> = {
  OUTSIDE_RADIUS: "Estás fuera del área de la sede. Acércate a la entrada e intenta de nuevo.",
  LOW_ACCURACY: "La ubicación del celular no es precisa. Activa el GPS, sal a un lugar despejado e intenta de nuevo.",
  LOCATION_DENIED: "Necesitamos tu ubicación solo en este momento para validar que estás en la sede. Actívala e intenta de nuevo.",
  DEVICE_NOT_BOUND: "Este celular no está vinculado a tu cuenta.",
  DEVICE_REVOKED: "Este celular fue desvinculado. Pide ayuda a tu administrador.",
  INVALID_QR: "Este código QR no es válido.",
  QR_REVOKED: "Este código QR ya no está vigente. Usa el QR actual de tu sede.",
  WRONG_COMPANY: "Este código QR no pertenece a tu empresa.",
  DUPLICATE_PUNCH: "Ya registraste una marcación hace un momento.",
  NO_OPEN_SESSION: "No tienes una jornada abierta.",
  RATE_LIMITED: "Demasiados intentos. Espera un momento.",
  PASSKEY_FAILED: "No se pudo confirmar tu identidad con tu huella o Face ID. Intenta de nuevo.",
  OTHER: "No se pudo registrar la marcación.",
};

export const PASSKEY_MISSING_MESSAGE = "Para marcar, primero activa tu huella o Face ID en este celular.";

/** Motivo de rechazo redactado para el administrador (en tercera persona). */
export const reasonLabel: Record<AttemptReason, string> = {
  OUTSIDE_RADIUS: "Fuera del área de la sede",
  LOW_ACCURACY: "Ubicación imprecisa (GPS)",
  LOCATION_DENIED: "No compartió la ubicación",
  DEVICE_NOT_BOUND: "Celular no vinculado o pendiente de aprobación",
  DEVICE_REVOKED: "Celular desvinculado",
  INVALID_QR: "Código QR no válido",
  QR_REVOKED: "Código QR vencido",
  WRONG_COMPANY: "QR de otra empresa",
  DUPLICATE_PUNCH: "Marcación repetida",
  NO_OPEN_SESSION: "Sin jornada abierta",
  RATE_LIMITED: "Demasiados intentos",
  PASSKEY_FAILED: "Huella o Face ID no confirmado",
  OTHER: "Otro motivo",
};

export type PunchResult =
  | { ok: true; type: "IN" | "OUT"; at: Date; siteName: string; flagged: boolean; workedMinutes?: number; staleClosed?: boolean }
  | { ok: false; reason: AttemptReason; message: string; distance?: number | null };

/** Valida el QR escaneado contra la empresa del empleado. */
async function resolveQr(publicCode: string, companyId: string) {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(publicCode)) return { error: "INVALID_QR" as const };
  const qr = await db.siteQrCode.findUnique({
    where: { publicCode },
    include: { site: { select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true, active: true, companyId: true } } },
  });
  if (!qr || !qr.site.active) return { error: "INVALID_QR" as const };
  if (qr.companyId !== companyId) return { error: "WRONG_COMPANY" as const };
  if (qr.revokedAt) return { error: "QR_REVOKED" as const, site: qr.site };
  return { error: null, qr, site: qr.site };
}

/** Estado actual del empleado: jornada abierta, si la hay. */
async function openSession(employeeId: string) {
  return db.workSession.findFirst({ where: { employeeId, status: "OPEN" }, include: { site: { select: { name: true } } } });
}

/**
 * Estado del celular y de la jornada del empleado (sin registrar nada): si este
 * navegador está vinculado, si debe activar huella o Face ID, si puede
 * reconocerse con ella, y si lo siguiente es entrada o salida.
 */
export async function employeeDeviceContext(actor: Actor, deviceToken: string | undefined) {
  const { employeeId } = requireEmployee(actor);
  const [binding, open, employee] = await Promise.all([
    findBinding(employeeId, deviceToken),
    openSession(employeeId),
    db.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { firstName: true, company: { select: { requireDeviceBinding: true, timezone: true } } } }),
  ]);
  const passkeys = binding?.status === "ACTIVE" ? await passkeysForBinding(actor.userId, binding.id) : [];
  const canRelink = !binding && !!(await relinkableBinding(actor.userId, employeeId));
  const passkeyExempt = binding?.status === "ACTIVE" && isPasskeyExempt(binding.label);
  const needsPasskeySetup = employee.company.requireDeviceBinding && binding?.status === "ACTIVE" && passkeys.length === 0 && !passkeyExempt;
  // Ya tiene un celular activo pero este navegador no lo recuerda (p. ej. la ventana que abre la cámara del iPhone).
  const hasOtherDevice = !binding && (await db.deviceBinding.count({ where: { employeeId, status: "ACTIVE" } })) > 0;
  const stale = open && Date.now() - open.startAt.getTime() > STALE_SESSION_HOURS * 3600_000;
  return {
    firstName: employee.firstName,
    timezone: employee.company.timezone,
    requireDevice: employee.company.requireDeviceBinding,
    device: binding ? { status: binding.status, label: binding.label } : null,
    passkeyRequired: passkeys.length > 0,
    canRelink,
    hasOtherDevice,
    needsPasskeySetup,
    next: open && !stale ? ("OUT" as const) : ("IN" as const),
    openSince: open && !stale ? open.startAt : null,
    openSiteName: open && !stale ? open.site.name : null,
  };
}

/** Información para la página del QR (sin registrar nada). */
export async function qrContext(actor: Actor, publicCode: string, deviceToken: string | undefined) {
  const { companyId } = requireEmployee(actor);
  const r = await resolveQr(publicCode, companyId);
  if (r.error) return { valid: false as const, message: reasonMessage[r.error] };
  return { valid: true as const, siteName: r.site.name, ...(await employeeDeviceContext(actor, deviceToken)) };
}

async function logAttempt(
  actor: Actor,
  reason: AttemptReason,
  siteId: string | null,
  detail: Record<string, unknown>,
  userAgent?: string | null,
): Promise<PunchResult> {
  await db.attendanceAttempt.create({
    data: {
      companyId: actor.companyId,
      userId: actor.userId,
      siteId,
      reason,
      detail: detail as Prisma.InputJsonValue,
      userAgent: userAgent?.slice(0, 300),
    },
  });
  return { ok: false, reason, message: reasonMessage[reason], distance: (detail.distance as number | null | undefined) ?? undefined };
}

class ConcurrentPunch extends Error {}

export const appPunchSchema = z.object({
  idempotencyKey: z.uuid(),
  position: z.object({ lat: z.number(), lng: z.number(), accuracy: z.number().min(0) }).nullable(),
});

/**
 * Marcar desde la app, sin escanear el QR: el QR solo hace falta la primera vez
 * para entrar. Se usa la sede activa más cercana a la ubicación del celular (o
 * la sede habitual si no hay ubicación) y su QR vigente, y se aplican las mismas
 * validaciones que al escanear: celular vinculado, huella o Face ID, ubicación
 * dentro del radio de esa sede, duplicados y hora del servidor.
 */
export async function punchFromApp(
  actor: Actor,
  rawInput: unknown,
  ctx: { deviceToken?: string; passkeyResponse?: AuthenticationResponseJSON; rp: RelyingParty; userAgent?: string | null; now?: Date },
): Promise<PunchResult> {
  const { companyId, employeeId } = requireEmployee(actor);
  const parsed = appPunchSchema.safeParse(rawInput);
  if (!parsed.success) return logAttempt(actor, "OTHER", null, { invalidInput: true }, ctx.userAgent);
  const { position } = parsed.data;
  const [sites, employee] = await Promise.all([
    db.site.findMany({
      where: { companyId, active: true },
      select: { id: true, latitude: true, longitude: true, qrCodes: { where: { revokedAt: null }, orderBy: { version: "desc" }, take: 1, select: { publicCode: true } } },
    }),
    db.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { defaultSiteId: true } }),
  ]);
  const withQr = sites.filter((x) => x.qrCodes[0]);
  if (withQr.length === 0) {
    await logAttempt(actor, "OTHER", null, { noActiveSite: true }, ctx.userAgent);
    return { ok: false, reason: "OTHER", message: "Tu empresa aún no tiene una sede activa con QR. Avísale a tu administrador." };
  }
  const site = position
    ? withQr.reduce((best, x) => {
        const d = (y: typeof x) => distanceMeters(position, { lat: Number(y.latitude), lng: Number(y.longitude) });
        return d(x) < d(best) ? x : best;
      })
    : (withQr.find((x) => x.id === employee.defaultSiteId) ?? withQr[0]!);
  return punch(actor, { publicCode: site.qrCodes[0]!.publicCode, idempotencyKey: parsed.data.idempotencyKey, position }, ctx);
}

export const punchSchema = z.object({
  publicCode: z.string().min(1).max(64),
  idempotencyKey: z.uuid(),
  position: z.object({ lat: z.number(), lng: z.number(), accuracy: z.number().min(0) }).nullable(),
});

/**
 * Registra una entrada o salida. Orden de validación: QR → dispositivo → passkey
 * → ubicación → duplicado. La hora la pone el servidor. Todo rechazo queda en
 * attendance_attempt con su motivo.
 */
export async function punch(
  actor: Actor,
  rawInput: unknown,
  ctx: { deviceToken?: string; passkeyResponse?: AuthenticationResponseJSON; rp: RelyingParty; userAgent?: string | null; now?: Date },
): Promise<PunchResult> {
  const { companyId, employeeId } = requireEmployee(actor);
  const parsed = punchSchema.safeParse(rawInput);
  if (!parsed.success) return logAttempt(actor, "OTHER", null, { invalidInput: true }, ctx.userAgent);
  const input = parsed.data;
  const now = ctx.now ?? new Date();

  // Reintento del mismo toque (red lenta, doble clic): devuelve el resultado ya registrado.
  const already = await db.attendanceEvent.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { site: { select: { name: true } } } });
  if (already) {
    if (already.employeeId !== employeeId) return logAttempt(actor, "OTHER", null, { idempotencyCollision: true }, ctx.userAgent);
    return { ok: true, type: already.type === "OUT" ? "OUT" : "IN", at: already.occurredAt, siteName: already.site.name, flagged: already.status === "FLAGGED" };
  }

  // 1. QR
  const qr = await resolveQr(input.publicCode, companyId);
  if (qr.error) return logAttempt(actor, qr.error, qr.site?.id ?? null, { publicCode: input.publicCode.slice(0, 64) }, ctx.userAgent);
  const site = qr.site;

  // 2. Dispositivo
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { requireDeviceBinding: true, geoMaxAccuracyM: true } });
  const binding = await findBinding(employeeId, ctx.deviceToken);
  if (company.requireDeviceBinding) {
    if (!binding) return logAttempt(actor, "DEVICE_NOT_BOUND", site.id, {}, ctx.userAgent);
    if (binding.status === "REVOKED") return logAttempt(actor, "DEVICE_REVOKED", site.id, { bindingId: binding.id }, ctx.userAgent);
    if (binding.status === "PENDING") {
      await logAttempt(actor, "DEVICE_NOT_BOUND", site.id, { bindingId: binding.id, pending: true }, ctx.userAgent);
      return { ok: false, reason: "DEVICE_NOT_BOUND", message: "Este celular está pendiente de aprobación por tu administrador." };
    }
  }
  const activeBinding = binding?.status === "ACTIVE" ? binding : null;

  // 3. Huella o Face ID (passkey): obligatoria cuando la empresa exige celular vinculado,
  //    salvo que el administrador haya autorizado este celular a marcar sin ella.
  let verification: "PASSKEY" | "DEVICE_TOKEN" = "DEVICE_TOKEN";
  if (activeBinding) {
    const hasPasskey = (await passkeysForBinding(actor.userId, activeBinding.id)).length > 0;
    if (hasPasskey) {
      if (!(await verifyPasskeyAssertion(actor, activeBinding.id, ctx.passkeyResponse, ctx.rp))) {
        return logAttempt(actor, "PASSKEY_FAILED", site.id, { bindingId: activeBinding.id }, ctx.userAgent);
      }
      verification = "PASSKEY";
    } else if (company.requireDeviceBinding && !isPasskeyExempt(activeBinding.label)) {
      await logAttempt(actor, "PASSKEY_FAILED", site.id, { bindingId: activeBinding.id, missing: true }, ctx.userAgent);
      return { ok: false, reason: "PASSKEY_FAILED", message: PASSKEY_MISSING_MESSAGE };
    }
  }

  // 4. Ubicación
  const geo = evaluateLocation(
    input.position as GeoInput,
    { lat: Number(site.latitude), lng: Number(site.longitude), radiusMeters: site.radiusMeters },
    company.geoMaxAccuracyM,
  );
  if (!geo.ok) {
    const reason = geo.status === "UNAVAILABLE" ? "LOCATION_DENIED" : geo.status === "LOW_ACCURACY" ? "LOW_ACCURACY" : "OUTSIDE_RADIUS";
    return logAttempt(actor, reason, site.id, { distance: geo.distance, accuracy: input.position?.accuracy ?? null, radius: site.radiusMeters }, ctx.userAgent);
  }

  // 5. Duplicado inmediato
  const last = await db.attendanceEvent.findFirst({ where: { employeeId }, orderBy: { occurredAt: "desc" }, select: { occurredAt: true } });
  if (last && now.getTime() - last.occurredAt.getTime() < MIN_SECONDS_BETWEEN_PUNCHES * 1000) {
    return logAttempt(actor, "DUPLICATE_PUNCH", site.id, { secondsSinceLast: Math.round((now.getTime() - last.occurredAt.getTime()) / 1000) }, ctx.userAgent);
  }

  const eventBase = {
    companyId,
    employeeId,
    siteId: site.id,
    occurredAt: now,
    source: "QR" as const,
    verification,
    geoStatus: "INSIDE" as const,
    latitude: input.position!.lat,
    longitude: input.position!.lng,
    accuracyMeters: Math.round(input.position!.accuracy),
    distanceMeters: geo.distance,
    qrCodeId: qr.qr.id,
    deviceBindingId: activeBinding?.id ?? null,
    idempotencyKey: input.idempotencyKey,
    userAgent: ctx.userAgent?.slice(0, 300),
  };

  try {
    const result = await db.$transaction(async (tx) => {
      // Una marcación a la vez por empleado: dos toques simultáneos se ordenan y el
      // segundo ve al primero (si no, uno registraba la entrada y el otro la salida).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId}))`;
      const lastInTx = await tx.attendanceEvent.findFirst({ where: { employeeId }, orderBy: { occurredAt: "desc" }, select: { occurredAt: true } });
      if (lastInTx && now.getTime() - lastInTx.occurredAt.getTime() < MIN_SECONDS_BETWEEN_PUNCHES * 1000) throw new ConcurrentPunch();
      let open = await tx.workSession.findFirst({ where: { employeeId, status: "OPEN" } });
      let staleClosed = false;
      // Jornada olvidada: pasa a revisión sin inventar hora de salida; esta marcación abre una nueva.
      if (open && now.getTime() - open.startAt.getTime() > STALE_SESSION_HOURS * 3600_000) {
        await tx.workSession.update({
          where: { id: open.id },
          data: { status: "NEEDS_REVIEW", reviewNote: `Sin salida registrada después de ${STALE_SESSION_HOURS} h` },
        });
        open = null;
        staleClosed = true;
      }

      if (!open) {
        const ev = await tx.attendanceEvent.create({ data: { ...eventBase, type: "IN", status: geo.flagged ? "FLAGGED" : "ACCEPTED" } });
        await tx.workSession.create({ data: { companyId, employeeId, siteId: site.id, inEventId: ev.id, startAt: now } });
        if (activeBinding) await tx.deviceBinding.update({ where: { id: activeBinding.id }, data: { lastSeenAt: now } });
        return { ok: true as const, type: "IN" as const, at: now, siteName: site.name, flagged: geo.flagged, ...(staleClosed ? { staleClosed } : {}) };
      }

      // Salida en una sede distinta a la de entrada: se acepta y queda para revisar.
      const flagged = geo.flagged || open.siteId !== site.id;
      const ev = await tx.attendanceEvent.create({ data: { ...eventBase, type: "OUT", status: flagged ? "FLAGGED" : "ACCEPTED" } });
      await tx.workSession.update({ where: { id: open.id }, data: { outEventId: ev.id, endAt: now, status: "CLOSED" } });
      if (activeBinding) await tx.deviceBinding.update({ where: { id: activeBinding.id }, data: { lastSeenAt: now } });
      const workedMinutes = Math.round((now.getTime() - open.startAt.getTime()) / 60000);
      return { ok: true as const, type: "OUT" as const, at: now, siteName: site.name, flagged, workedMinutes, sessionStart: open.startAt };
    });
    if (result.type === "OUT") {
      // Al cerrar la jornada se detectan las horas extra del día (no bloquea la marcación si falla).
      const { sessionStart, ...rest } = result;
      const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
      await detectOvertime(companyId, employeeId, localDate(sessionStart, company.timezone)).catch((e) => console.error("detectOvertime", e));
      return rest;
    }
    return result;
  } catch (e) {
    // Dos solicitudes simultáneas: el bloqueo o el índice único "una jornada abierta por empleado" rechaza la segunda.
    if (e instanceof ConcurrentPunch || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
      return logAttempt(actor, "DUPLICATE_PUNCH", site.id, { concurrent: true }, ctx.userAgent);
    }
    throw e;
  }
}

// ───────────────────────────── Vistas ─────────────────────────────

export type DayStatus = "working" | "done" | "late" | "absent" | "upcoming" | "rest" | "review" | "novelty";

/** Asistencia del día para el administrador: estado, entrada, salida, horas y tardanza por empleado. */
export async function attendanceDay(actor: Actor, now = new Date()) {
  const companyId = requireCompanyAdmin(actor);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true, lateToleranceMin: true } });
  const tz = company.timezone;
  const today = localDate(now, tz);
  const dayStart = zonedTimeToUtc(today, 0, tz);
  const dayEnd = zonedTimeToUtc(today, 1440, tz);

  const [employees, sessions, attempts, pendingDevices] = await Promise.all([
    db.employee.findMany({ where: { companyId, status: "ACTIVE" }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true, position: true } }),
    db.workSession.findMany({
      // Jornadas que tocan el día de hoy, más las que siguen abiertas o por revisar.
      where: { companyId, OR: [{ startAt: { gte: dayStart, lt: dayEnd } }, { status: { in: ["OPEN", "NEEDS_REVIEW"] } }, { endAt: { gte: dayStart } }] },
      orderBy: { startAt: "asc" },
      include: { site: { select: { name: true } }, inEvent: { select: { status: true } }, outEvent: { select: { status: true } } },
    }),
    db.attendanceAttempt.findMany({ where: { companyId, occurredAt: { gte: new Date(now.getTime() - 7 * 86400_000) } }, orderBy: { occurredAt: "desc" }, take: 20 }),
    db.deviceBinding.count({ where: { companyId, status: "PENDING" } }),
  ]);
  const [patterns, overrides] = await Promise.all([loadPatterns(companyId), loadOverrides(companyId, shiftIsoDays(today, -1), today)]);
  const novelties = await approvedNoveltiesOn(companyId, today);
  const holiday = holidayOn(today);
  const userIds = [...new Set(attempts.map((a) => a.userId).filter(Boolean))] as string[];
  const attemptUsers = new Map((await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const siteNames = new Map((await db.site.findMany({ where: { companyId }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));

  const rows = employees.map((e) => {
    const ov = overrides.get(e.id) ?? [];
    const shift = currentOrNextShift(patterns.get(e.id) ?? [], now, tz, ov) ?? shiftsOn(patterns.get(e.id) ?? [], today, tz, ov)[0] ?? null;
    const mine = sessions.filter((s) => s.employeeId === e.id);
    const todays = mine.filter((s) => s.startAt >= dayStart || s.status === "OPEN" || (s.endAt && s.endAt >= dayStart));
    const open = mine.find((s) => s.status === "OPEN");
    const review = mine.find((s) => s.status === "NEEDS_REVIEW");
    const firstIn = todays[0]?.startAt ?? null;
    const lastOut = [...todays].reverse().find((s) => s.endAt)?.endAt ?? null;
    const workedMinutes = todays.reduce((acc, s) => acc + Math.max(0, ((s.endAt ?? now).getTime() - s.startAt.getTime()) / 60000), 0);
    const lateMinutes = shift && firstIn ? Math.round((firstIn.getTime() - shift.start.getTime()) / 60000) : 0;
    const isLate = !!shift && !!firstIn && lateMinutes > company.lateToleranceMin;
    const flagged = todays.some((s) => s.inEvent.status === "FLAGGED" || s.outEvent?.status === "FLAGGED");

    let status: DayStatus;
    if (review) status = "review";
    else if (open) status = isLate ? "late" : "working";
    else if (todays.length > 0) status = isLate ? "late" : "done";
    else if (novelties.some((n) => n.employeeId === e.id && n.hours == null)) status = "novelty";
    else if (!shift) status = "rest";
    else if (now.getTime() > shift.start.getTime() + company.lateToleranceMin * 60000) status = "absent";
    else status = "upcoming";

    return { ...e, shift, status, firstIn, lastOut, working: !!open, workedMinutes: Math.round(workedMinutes), lateMinutes: isLate ? lateMinutes : 0, flagged, siteName: todays[0]?.site.name ?? shift?.siteName ?? null,
      novelty: (() => { const n = novelties.find((x) => x.employeeId === e.id); return n ? (n.hours ? `${noveltyLabel[n.type]} (${Number(n.hours)} h)` : noveltyLabel[n.type]) : null; })() };
  });

  return {
    today,
    timezone: tz,
    holiday,
    rows,
    present: rows.filter((r) => r.working).length,
    late: rows.filter((r) => r.lateMinutes > 0).length,
    absent: rows.filter((r) => r.status === "absent").length,
    workedMinutes: rows.reduce((a, r) => a + r.workedMinutes, 0),
    pendingDevices,
    attempts: attempts.map((a) => ({ ...a, userName: a.userId ? (attemptUsers.get(a.userId) ?? "—") : "—", siteName: a.siteId ? (siteNames.get(a.siteId) ?? "—") : "—", message: reasonLabel[a.reason] })),
  };
}

/** Pantalla del empleado: jornada abierta o la última de hoy. */
export async function employeeToday(actor: Actor, now = new Date()) {
  const { companyId, employeeId } = requireEmployee(actor);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const dayStart = zonedTimeToUtc(localDate(now, company.timezone), 0, company.timezone);
  const [open, last] = await Promise.all([
    db.workSession.findFirst({ where: { employeeId, status: "OPEN" } }),
    db.workSession.findFirst({ where: { employeeId, status: "CLOSED", startAt: { gte: dayStart } }, orderBy: { startAt: "desc" } }),
  ]);
  const stale = open && now.getTime() - open.startAt.getTime() > STALE_SESSION_HOURS * 3600_000;
  return { open: stale ? null : open, lastClosed: last };
}

/** Historial del propio empleado (nunca de otros). */
export async function employeeHistory(actor: Actor, days = 31) {
  const { companyId, employeeId } = requireEmployee(actor);
  const since = new Date(Date.now() - days * 86400_000);
  const [company, sessions] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } }),
    db.workSession.findMany({
      where: { companyId, employeeId, startAt: { gte: since } },
      orderBy: { startAt: "desc" },
      include: { site: { select: { name: true } } },
    }),
  ]);
  return { timezone: company.timezone, sessions };
}
