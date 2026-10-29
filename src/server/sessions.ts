import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { Role } from "@/generated/prisma/enums";
import { audit } from "@/server/audit";

/** Versión vigente de la autorización de tratamiento de datos (Ley 1581 de 2012). */
export const CONSENT_POLICY_VERSION = "2026-10-v1";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

// Empleados: sesión larga en su celular (marcan a diario). Administradores: corta.
const SESSION_TTL_MS: Record<Role, number> = {
  EMPLOYEE: 60 * 24 * 60 * 60 * 1000,
  COMPANY_ADMIN: 12 * 60 * 60 * 1000,
  SUPERADMIN: 8 * 60 * 60 * 1000,
};
// Se renueva la expiración como máximo una vez por hora (evita escribir en cada solicitud).
const SLIDE_EVERY_MS = 60 * 60 * 1000;

/** El token viaja solo en la cookie; en la BD se guarda su SHA-256. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type Actor = {
  userId: string;
  sessionId: string;
  role: Role;
  companyId: string | null;
  companyName: string | null;
  name: string;
  email: string;
  employeeId: string | null;
  mustChangePassword: boolean;
  hasConsent: boolean;
};

export async function createSession(userId: string, role: Role, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS[role]);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) } });
  return { token, expiresAt };
}

/** Devuelve el actor de una sesión válida, o null. Renueva la expiración (ventana deslizante). */
export async function validateSessionToken(token: string): Promise<Actor | null> {
  const id = hashToken(token);
  const session = await db.session.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          company: { select: { name: true, status: true } },
          employee: { select: { id: true, status: true } },
          consents: { where: { policyVersion: CONSENT_POLICY_VERSION }, select: { id: true } },
        },
      },
    },
  });
  if (!session) return null;

  const now = Date.now();
  const { user } = session;
  const blocked =
    session.expiresAt.getTime() <= now ||
    !user.active ||
    user.company?.status === "SUSPENDED" ||
    (user.role === "EMPLOYEE" && user.employee?.status !== "ACTIVE");
  if (blocked) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }

  if (now - session.lastSeenAt.getTime() > SLIDE_EVERY_MS) {
    await db.session.update({
      where: { id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_TTL_MS[user.role]) },
    });
  }

  return {
    userId: user.id,
    sessionId: id,
    role: user.role,
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
    name: user.name,
    email: user.email,
    employeeId: user.employee?.id ?? null,
    mustChangePassword: user.mustChangePassword,
    hasConsent: user.consents.length > 0,
  };
}

export async function revokeSession(token: string) {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({ where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) } });
}

// Hash de relleno: si el correo no existe, se verifica igual contra él para que
// la respuesta tarde lo mismo y no revele qué correos están registrados.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; role: Role; mustChangePassword: boolean }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; minutes: number };

export async function authenticate(email: string, password: string, userAgent?: string | null): Promise<LoginResult> {
  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { company: { select: { status: true } }, employee: { select: { status: true } } },
  });

  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    return { ok: false, reason: "invalid" };
  }

  const now = Date.now();
  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    return { ok: false, reason: "locked", minutes: Math.ceil((user.lockedUntil.getTime() - now) / 60000) };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  const allowed =
    user.active && user.company?.status !== "SUSPENDED" && (user.role !== "EMPLOYEE" || user.employee?.status === "ACTIVE");

  if (!valid || !allowed) {
    const failed = valid ? user.failedLogins : user.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(now + LOCK_MINUTES * 60000) : user.lockedUntil },
    });
    await audit({
      companyId: user.companyId,
      actorUserId: user.id,
      action: lock ? "auth.locked" : "auth.login_failed",
      entityType: "user",
      entityId: user.id,
      after: { reason: valid ? "inactive" : "bad_password" },
      userAgent,
    });
    if (lock) return { ok: false, reason: "locked", minutes: LOCK_MINUTES };
    return { ok: false, reason: "invalid" };
  }

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date(now) } });
  const { token, expiresAt } = await createSession(user.id, user.role, userAgent);
  await audit({ companyId: user.companyId, actorUserId: user.id, action: "auth.login", entityType: "user", entityId: user.id, userAgent });
  return { ok: true, token, expiresAt, role: user.role, mustChangePassword: user.mustChangePassword };
}

export async function changePassword(actor: Actor, current: string, next: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!(await verifyPassword(user.passwordHash, current))) return { ok: false as const, field: "current" };
  if (next.toLowerCase().includes(user.email.split("@")[0]!.toLowerCase())) return { ok: false as const, field: "email" };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), mustChangePassword: false } });
  // Cerrar las demás sesiones: si alguien conocía la clave anterior, pierde el acceso.
  await revokeUserSessions(user.id, actor.sessionId);
  await audit({ companyId: actor.companyId, actorUserId: actor.userId, action: "auth.password_changed", entityType: "user", entityId: user.id });
  return { ok: true as const };
}

export async function recordConsent(actor: Actor, userAgent?: string | null) {
  await db.dataConsent.upsert({
    where: { userId_policyVersion: { userId: actor.userId, policyVersion: CONSENT_POLICY_VERSION } },
    update: {},
    create: { userId: actor.userId, policyVersion: CONSENT_POLICY_VERSION, userAgent: userAgent?.slice(0, 300) },
  });
  await audit({
    companyId: actor.companyId,
    actorUserId: actor.userId,
    action: "privacy.consent",
    entityType: "user",
    entityId: actor.userId,
    after: { policyVersion: CONSENT_POLICY_VERSION },
  });
}

export function homeFor(role: Role) {
  return role === "SUPERADMIN" ? "/plataforma" : role === "COMPANY_ADMIN" ? "/admin" : "/app";
}
