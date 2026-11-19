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
import type { RelyingParty } from "@/server/passkeys";
import { createSession, hashIp, IP_WINDOW_MINUTES, MAX_FAILED_PER_IP, revokeUserSessions, type Actor } from "@/server/sessions";

/**
 * Entrada del empleado SIN correo ni contraseña:
 *  1. Al crearlo, Nexora genera un código de activación (un solo uso, 7 días).
 *  2. En /activar el empleado escribe su cédula y el código: ese celular queda
 *     activo de inmediato (si tenía otro, el anterior se retira solo) y enseguida
 *     registra su huella o Face ID.
 *  3. Desde ahí entra con Face ID o huella (passkey) en /ingresar.
 * El administrador no aprueba nada.
 */

export const ACTIVATION_TTL_DAYS = 7;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O, 1/I/L
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Normaliza lo que escribe la persona: sin espacios ni guiones, en mayúsculas. */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
const normalizeDocument = (doc: string) => doc.toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashCode = (code: string) => createHash("sha256").update(`nexora-activation:${normalizeCode(code)}`).digest("hex");

/** Código legible de 8 caracteres, p. ej. "K7M2-X9PT" (≈ 8,5 × 10¹¹ combinaciones). */
function newCode() {
  const pick = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `${pick()}-${pick()}`;
}

/** Genera un código nuevo y anula los anteriores sin usar del mismo empleado. */
export async function issueActivationCode(
  companyId: string,
  employeeId: string,
  createdById: string | null,
  tx: Prisma.TransactionClient = db,
) {
  const code = newCode();
  const now = new Date();
  await tx.activationCode.updateMany({ where: { employeeId, usedAt: null }, data: { usedAt: now } });
  await tx.activationCode.create({
    data: {
      companyId,
      employeeId,
      codeHash: hashCode(code),
      expiresAt: new Date(now.getTime() + ACTIVATION_TTL_DAYS * 86_400_000),
      createdById,
    },
  });
  return code;
}

/** Botón del administrador «Nuevo código» (p. ej. si el empleado no alcanzó a usarlo). */
export async function newActivationCode(actor: Actor, employeeId: string) {
  const companyId = requireCompanyAdmin(actor);
  const employee = await db.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true, status: true } });
  if (!employee) throw notFound("El empleado");
  if (employee.status !== "ACTIVE") throw new AppError("CONFLICT", "El empleado está desactivado.");
  const code = await db.$transaction(async (tx) => {
    const c = await issueActivationCode(companyId, employeeId, actor.userId, tx);
    await audit({ companyId, actorUserId: actor.userId, action: "employee.activation_code", entityType: "employee", entityId: employeeId }, tx);
    return c;
  });
  return code;
}

async function throttled(ip: string | null | undefined) {
  if (!ip) return false;
  const since = new Date(Date.now() - IP_WINDOW_MINUTES * 60_000);
  return (await db.loginThrottle.count({ where: { ipHash: hashIp(ip), occurredAt: { gte: since } } })) >= MAX_FAILED_PER_IP;
}
async function recordFailure(ip: string | null | undefined) {
  if (ip) await db.loginThrottle.create({ data: { ipHash: hashIp(ip) } });
}

export type ActivationResult =
  | { ok: true; sessionToken: string; sessionExpires: Date; deviceToken: string }
  | { ok: false; message: string };

const INVALID = "La cédula o el código no coinciden, o el código ya se usó o venció. Revísalos e intenta de nuevo.";

/**
 * Cédula + código: activa ESTE celular. Retira los celulares anteriores (y sus
 * passkeys dejan de servir) y cierra las sesiones viejas: un celular nuevo
 * reemplaza al anterior sin intervención del administrador.
 */
export async function activateWithCode(
  input: { documentNumber: string; code: string },
  userAgent?: string | null,
  ip?: string | null,
): Promise<ActivationResult> {
  if (await throttled(ip)) return { ok: false, message: `Demasiados intentos desde esta red. Espera ${IP_WINDOW_MINUTES} min e intenta de nuevo.` };
  const code = normalizeCode(input.code);
  const doc = normalizeDocument(input.documentNumber);
  if (code.length !== 8 || doc.length < 3) {
    await recordFailure(ip);
    return { ok: false, message: INVALID };
  }
  const found = await db.activationCode.findUnique({
    where: { codeHash: hashCode(code) },
    include: { employee: { include: { user: true, company: { select: { status: true } } } } },
  });
  const e = found?.employee;
  const valid =
    found &&
    e &&
    !found.usedAt &&
    found.expiresAt.getTime() > Date.now() &&
    normalizeDocument(e.documentNumber) === doc &&
    e.status === "ACTIVE" &&
    e.user.active &&
    e.company.status !== "SUSPENDED";
  if (!valid) {
    await recordFailure(ip);
    return { ok: false, message: INVALID };
  }

  const deviceToken = randomBytes(32).toString("base64url");
  const ok = await db.$transaction(async (tx) => {
    const now = new Date();
    // Condicional: dos envíos simultáneos del mismo código no activan dos celulares.
    const used = await tx.activationCode.updateMany({ where: { id: found.id, usedAt: null }, data: { usedAt: now } });
    if (used.count !== 1) return false;
    const retired = await tx.deviceBinding.updateMany({
      where: { employeeId: e.id, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "REVOKED", revokedAt: now, revokeReason: "Reemplazado al activar un celular nuevo" },
    });
    const b = await tx.deviceBinding.create({
      data: {
        companyId: e.companyId,
        employeeId: e.id,
        tokenHash: hashDeviceToken(deviceToken),
        label: deviceLabel(userAgent),
        userAgent: userAgent?.slice(0, 300),
        status: "ACTIVE",
        activatedAt: now,
        lastSeenAt: now,
      },
    });
    await tx.user.update({ where: { id: e.userId }, data: { mustChangePassword: false, failedLogins: 0, lockedUntil: null, lastLoginAt: now } });
    await audit(
      { companyId: e.companyId, actorUserId: e.userId, action: "employee.activate", entityType: "device", entityId: b.id, after: { label: b.label, replaced: retired.count }, userAgent },
      tx,
    );
    return true;
  });
  if (!ok) return { ok: false, message: INVALID };

  await revokeUserSessions(e.userId);
  const s = await createSession(e.userId, "EMPLOYEE", userAgent);
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

const NOT_RECOGNIZED = "No reconocimos tu huella o Face ID en Nexora. Si es tu primera vez o cambiaste de celular, actívalo con tu cédula y código.";

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
