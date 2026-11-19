import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { deviceLabel, hashDeviceToken, RELINK_SUFFIX, MAX_RELINKED_WINDOWS } from "@/server/devices";
import { AppError, notFound } from "@/server/errors";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import type { RelyingParty } from "@/server/passkeys";
import { createSession, hashIp, IP_WINDOW_MINUTES, MAX_FAILED_PER_IP, revokeUserSessions, type Actor } from "@/server/sessions";

/**
 * Entrada del empleado SIN correo ni contraseña:
 *  - Cada empleado tiene un código de acceso PERMANENTE (10 caracteres). Con él
 *    entra desde /ingresar o /activar. Si lo usa en otro celular, ese celular
 *    reemplaza al anterior (y las sesiones viejas se cierran).
 *  - El administrador lo ve cuando quiera (se guarda cifrado) y puede cambiarlo.
 *  - Face ID o huella: el administrador decide por empleado si se exige para
 *    marcar; si no, el empleado puede activarla por su cuenta.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O, 1/I/L
const CODE_LENGTH = 10; // 31^10 ≈ 8 × 10^14 combinaciones
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Normaliza lo que escribe la persona: sin espacios ni guiones, en mayúsculas. */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashCode = (code: string) => createHash("sha256").update(`nexora-access:${normalizeCode(code)}`).digest("hex");
const codeAad = (companyId: string, employeeId: string) => `${companyId}|access-code|${employeeId}`;

/** Código legible, p. ej. "K7M2X-9PTQR". */
function newCode() {
  const pick = (n: number) => Array.from({ length: n }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `${pick(5)}-${pick(5)}`;
}

/** Asigna un código nuevo al empleado (el anterior deja de servir). */
export async function assignAccessCode(companyId: string, employeeId: string, tx: Prisma.TransactionClient = db) {
  const code = newCode();
  await tx.employee.update({
    where: { id: employeeId },
    data: { accessCodeHash: hashCode(code), accessCodeEnc: encryptSecret(code, codeAad(companyId, employeeId)) },
  });
  return code;
}

/** Código actual del empleado, para que el administrador lo vea o lo reenvíe (null si no tiene). */
export async function getAccessCode(actor: Actor, employeeId: string) {
  const companyId = requireCompanyAdmin(actor);
  const e = await db.employee.findFirst({ where: { id: employeeId, companyId }, select: { accessCodeEnc: true } });
  if (!e) throw notFound("El empleado");
  if (!e.accessCodeEnc) return null;
  try {
    return decryptSecret(e.accessCodeEnc, codeAad(companyId, employeeId));
  } catch {
    return null;
  }
}

/**
 * «Cambiar código» (p. ej. si se filtró): el anterior deja de servir, se
 * cierran sus sesiones y se retiran sus celulares; entra de nuevo con el nuevo.
 */
export async function regenerateAccessCode(actor: Actor, employeeId: string) {
  const companyId = requireCompanyAdmin(actor);
  const employee = await db.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true, userId: true, status: true } });
  if (!employee) throw notFound("El empleado");
  if (employee.status !== "ACTIVE") throw new AppError("CONFLICT", "El empleado está desactivado.");
  const code = await db.$transaction(async (tx) => {
    const c = await assignAccessCode(companyId, employeeId, tx);
    await tx.deviceBinding.updateMany({
      where: { employeeId, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "REVOKED", revokedAt: new Date(), revokeReason: "Código de acceso cambiado" },
    });
    await audit({ companyId, actorUserId: actor.userId, action: "employee.access_code", entityType: "employee", entityId: employeeId }, tx);
    return c;
  });
  await revokeUserSessions(employee.userId);
  return code;
}

/** El administrador decide si a este empleado se le exige Face ID o huella para marcar. */
export async function setRequirePasskey(actor: Actor, employeeId: string, required: boolean) {
  const companyId = requireCompanyAdmin(actor);
  const e = await db.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } });
  if (!e) throw notFound("El empleado");
  await db.$transaction(async (tx) => {
    await tx.employee.update({ where: { id: employeeId }, data: { requirePasskey: required } });
    await audit({ companyId, actorUserId: actor.userId, action: required ? "employee.passkey_required" : "employee.passkey_optional", entityType: "employee", entityId: employeeId }, tx);
  });
}

async function throttled(ip: string | null | undefined) {
  if (!ip) return false;
  const since = new Date(Date.now() - IP_WINDOW_MINUTES * 60_000);
  return (await db.loginThrottle.count({ where: { ipHash: hashIp(ip), occurredAt: { gte: since } } })) >= MAX_FAILED_PER_IP;
}
async function recordFailure(ip: string | null | undefined) {
  if (ip) await db.loginThrottle.create({ data: { ipHash: hashIp(ip) } });
}

export type CodeLoginResult =
  | { ok: true; sessionToken: string; sessionExpires: Date; deviceToken: string | null }
  | { ok: false; message: string };

const INVALID = "Código incorrecto. Revísalo o pídele el tuyo a tu empresa.";

/**
 * Entrar con el código. Si este navegador ya es el celular activo del
 * empleado, solo abre la sesión; si no, este celular reemplaza al anterior.
 */
export async function loginWithCode(
  rawCode: string,
  currentDeviceToken: string | undefined,
  userAgent?: string | null,
  ip?: string | null,
): Promise<CodeLoginResult> {
  if (await throttled(ip)) return { ok: false, message: `Demasiados intentos desde esta red. Espera ${IP_WINDOW_MINUTES} min e intenta de nuevo.` };
  const code = normalizeCode(rawCode);
  const e =
    code.length === CODE_LENGTH
      ? await db.employee.findUnique({ where: { accessCodeHash: hashCode(code) }, include: { user: true, company: { select: { status: true } } } })
      : null;
  if (!e || e.status !== "ACTIVE" || !e.user.active || e.company.status === "SUSPENDED") {
    await recordFailure(ip);
    return { ok: false, message: INVALID };
  }

  const known = currentDeviceToken
    ? await db.deviceBinding.findFirst({ where: { employeeId: e.id, status: "ACTIVE", tokenHash: hashDeviceToken(currentDeviceToken) } })
    : null;
  let deviceToken: string | null = null;
  if (!known) {
    deviceToken = randomBytes(32).toString("base64url");
    const t = deviceToken;
    const replaced = await db.$transaction(async (tx) => {
      const now = new Date();
      const retired = await tx.deviceBinding.updateMany({
        where: { employeeId: e.id, status: { in: ["ACTIVE", "PENDING"] } },
        data: { status: "REVOKED", revokedAt: now, revokeReason: "Reemplazado al entrar con el código en otro celular" },
      });
      const b = await tx.deviceBinding.create({
        data: {
          companyId: e.companyId, employeeId: e.id, tokenHash: hashDeviceToken(t), label: deviceLabel(userAgent),
          userAgent: userAgent?.slice(0, 300), status: "ACTIVE", activatedAt: now, lastSeenAt: now,
        },
      });
      await audit({ companyId: e.companyId, actorUserId: e.userId, action: "device.bind", entityType: "device", entityId: b.id, after: { method: "access_code", label: b.label, replaced: retired.count }, userAgent }, tx);
      return retired.count;
    });
    // El celular anterior pierde la sesión.
    if (replaced > 0) await revokeUserSessions(e.userId);
  }
  await db.user.update({ where: { id: e.userId }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date(), mustChangePassword: false } });
  const s = await createSession(e.userId, "EMPLOYEE", userAgent);
  await audit({ companyId: e.companyId, actorUserId: e.userId, action: "auth.login", entityType: "user", entityId: e.userId, after: { method: "access_code" }, userAgent });
  return { ok: true, sessionToken: s.token, sessionExpires: s.expiresAt, deviceToken };
}

// ───────────────────────── Entrar con Face ID o huella ─────────────────────────

const hashLoginToken = (t: string) => createHash("sha256").update(`nexora-passkey-login:${t}`).digest("hex");

/** Opciones para que el celular ofrezca sus passkeys de Nexora (sin pedir correo). */
export async function passkeyLoginOptions(rp: RelyingParty) {
  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "required" });
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.passkeyLogin.create({ data: { id: hashLoginToken(token), challenge: options.challenge, expiresAt: new Date(now + CHALLENGE_TTL_MS) } });
  if (Math.random() < 0.05) await db.passkeyLogin.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  return { options, token };
}

export type PasskeyLoginResult =
  | { ok: true; sessionToken: string; sessionExpires: Date; deviceToken: string | null }
  | { ok: false; message: string };

const NOT_RECOGNIZED = "No reconocimos tu huella o Face ID en Nexora. Entra con tu código de empleado.";

/**
 * Verifica la firma de la passkey y abre la sesión de su dueño. La passkey
 * debe pertenecer a un celular ACTIVO del empleado. Si este navegador no tiene
 * ya el celular reconocido, se reconoce como una ventana más del mismo celular.
 */
export async function passkeyLogin(
  token: string | undefined,
  response: AuthenticationResponseJSON,
  rp: RelyingParty,
  currentDeviceToken: string | undefined,
  userAgent?: string | null,
  ip?: string | null,
): Promise<PasskeyLoginResult> {
  if (await throttled(ip)) return { ok: false, message: `Demasiados intentos desde esta red. Espera ${IP_WINDOW_MINUTES} min e intenta de nuevo.` };
  if (!token) return { ok: false, message: "La solicitud venció. Intenta de nuevo." };
  const row = await db.passkeyLogin.findUnique({ where: { id: hashLoginToken(token) } });
  if (row) await db.passkeyLogin.delete({ where: { id: row.id } }).catch(() => {});
  if (!row || row.expiresAt.getTime() < Date.now()) return { ok: false, message: "La solicitud venció. Intenta de nuevo." };

  const cred = await db.passkeyCredential.findUnique({
    where: { credentialId: response.id },
    include: { deviceBinding: true, user: { include: { employee: true, company: { select: { status: true } } } } },
  });
  const u = cred?.user;
  const binding = cred?.deviceBinding;
  const allowed =
    cred && u && binding && binding.status === "ACTIVE" && u.active && u.role === "EMPLOYEE" &&
    u.employee?.status === "ACTIVE" && binding.employeeId === u.employee.id && u.company?.status !== "SUSPENDED";
  if (!allowed) {
    await recordFailure(ip);
    return { ok: false, message: NOT_RECOGNIZED };
  }
  let verified = false;
  try {
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: row.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: { id: cred.credentialId, publicKey: new Uint8Array(cred.publicKey), counter: Number(cred.counter), transports: cred.transports },
      requireUserVerification: true,
    });
    verified = v.verified;
    if (verified) {
      await db.passkeyCredential.update({ where: { id: cred.id }, data: { counter: BigInt(v.authenticationInfo.newCounter), lastUsedAt: new Date() } });
    }
  } catch {
    verified = false;
  }
  if (!verified) {
    await recordFailure(ip);
    return { ok: false, message: NOT_RECOGNIZED };
  }

  const employee = u.employee!;
  // ¿Este navegador ya tiene el celular reconocido?
  const known = currentDeviceToken
    ? await db.deviceBinding.findFirst({ where: { employeeId: employee.id, status: "ACTIVE", tokenHash: hashDeviceToken(currentDeviceToken) } })
    : null;
  let deviceToken: string | null = null;
  if (!known) {
    deviceToken = randomBytes(32).toString("base64url");
    const t = deviceToken;
    await db.$transaction(async (tx) => {
      const now = new Date();
      const b = await tx.deviceBinding.create({
        data: {
          companyId: employee.companyId, employeeId: employee.id, tokenHash: hashDeviceToken(t),
          label: `${deviceLabel(userAgent)}${RELINK_SUFFIX}`, userAgent: userAgent?.slice(0, 300),
          status: "ACTIVE", activatedAt: now, lastSeenAt: now,
        },
      });
      const windows = await tx.deviceBinding.findMany({
        where: { employeeId: employee.id, status: "ACTIVE", label: { endsWith: RELINK_SUFFIX } },
        orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { activatedAt: "desc" }],
        select: { id: true },
      });
      const old = windows.slice(MAX_RELINKED_WINDOWS).map((w) => w.id);
      if (old.length) {
        await tx.deviceBinding.updateMany({ where: { id: { in: old } }, data: { status: "REVOKED", revokedAt: now, revokeReason: "Ventana reconocida más antigua" } });
      }
      await audit({ companyId: employee.companyId, actorUserId: u.id, action: "device.relink", entityType: "device", entityId: b.id, after: { method: "passkey_login", source: binding.id } }, tx);
    });
  }
  await db.user.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  const s = await createSession(u.id, "EMPLOYEE", userAgent);
  await audit({ companyId: u.companyId, actorUserId: u.id, action: "auth.login", entityType: "user", entityId: u.id, after: { method: "passkey" }, userAgent });
  return { ok: true, sessionToken: s.token, sessionExpires: s.expiresAt, deviceToken };
}
