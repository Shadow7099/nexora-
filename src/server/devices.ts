import "server-only";
import { createHash, randomBytes } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { requireCompanyAdmin, requireEmployee } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/**
 * Vinculación de dispositivo: un token aleatorio vive en una cookie httpOnly del
 * celular del empleado; en la base de datos solo se guarda su hash.
 * No se usa la IP (cambia con los datos móviles y la comparten muchos).
 */
export const hashDeviceToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Etiqueta legible del dispositivo a partir del user-agent (solo informativa). */
export function deviceLabel(ua?: string | null) {
  if (!ua) return "Dispositivo";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Dispositivo";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Navegador";
  return `${os} · ${browser}`;
}

/** Vinculación de este celular para el empleado actual (por el token de su cookie). */
export async function findBinding(employeeId: string, token: string | undefined | null) {
  if (!token) return null;
  return db.deviceBinding.findFirst({ where: { employeeId, tokenHash: hashDeviceToken(token) } });
}

/**
 * Celular ACTIVO del empleado que tiene huella (passkey) registrada: permite
 * reconocerlo de nuevo con la huella si el navegador perdió la cookie (p. ej.
 * en iPhone, Safari y el ícono de la pantalla de inicio no comparten cookies).
 */
export async function relinkableBinding(userId: string, employeeId: string) {
  return db.deviceBinding.findFirst({
    where: { employeeId, status: "ACTIVE", passkeys: { some: { userId } } },
    orderBy: { activatedAt: "desc" },
  });
}

/**
 * Excepción de huella/Face ID: el administrador permite que un celular puntual
 * (p. ej. uno viejo sin huella ni Face ID) marque sin ella. Queda en la
 * etiqueta del celular, visible para el administrador, y no pasa a un celular
 * nuevo.
 */
export const NO_PASSKEY_SUFFIX = " · sin huella autorizado";
export const isPasskeyExempt = (label: string) => label.includes(NO_PASSKEY_SUFFIX);

export async function setPasskeyExemption(actor: Actor, id: string, allow: boolean) {
  const companyId = requireCompanyAdmin(actor);
  const d = await getCompanyDevice(companyId, id);
  if (d.status !== "ACTIVE") throw new AppError("CONFLICT", "Solo se puede cambiar en un celular activo.");
  if (isPasskeyExempt(d.label) === allow) return;
  const label = allow ? `${d.label}${NO_PASSKEY_SUFFIX}` : d.label.replace(NO_PASSKEY_SUFFIX, "");
  await db.$transaction(async (tx) => {
    await tx.deviceBinding.update({ where: { id: d.id }, data: { label } });
    await audit({ companyId, actorUserId: actor.userId, action: allow ? "device.passkey_exempt" : "device.passkey_required", entityType: "device", entityId: d.id, after: { label } }, tx);
  });
}

/** Marca de las ventanas del MISMO celular reconocidas con la huella (Safari, el ícono, la ventana de la cámara…). */
export const RELINK_SUFFIX = " · reconocido con huella";

/**
 * Reconoce ESTE navegador como el mismo celular, después de verificar la
 * huella. No reemplaza el token de los otros navegadores del celular: en
 * iPhone, Safari, el ícono de la pantalla de inicio y la ventana que abre la
 * cámara guardan cookies por separado, y rotar un único token hacía que cada
 * uno anulara al otro (pedía confirmar en cada escaneo).
 */
export async function addRelinkedWindow(actor: Actor, sourceBindingId: string, userAgent?: string | null) {
  const { companyId, employeeId } = requireEmployee(actor);
  const token = randomBytes(32).toString("base64url");
  await db.$transaction(async (tx) => {
    const source = await tx.deviceBinding.findFirst({ where: { id: sourceBindingId, employeeId, status: "ACTIVE" } });
    if (!source) throw notFound("El celular");
    const now = new Date();
    const b = await tx.deviceBinding.create({
      data: {
        companyId, employeeId, tokenHash: hashDeviceToken(token), label: `${deviceLabel(userAgent)}${RELINK_SUFFIX}`,
        userAgent: userAgent?.slice(0, 300), status: "ACTIVE", activatedAt: now, lastSeenAt: now,
      },
    });
    const retired = await retireOldBindings(tx, employeeId);
    await audit({ companyId, actorUserId: actor.userId, action: "device.relink", entityType: "device", entityId: b.id, after: { method: "passkey", source: source.id, label: b.label, retired } }, tx);
  });
  return token;
}

/** Accesos (celular o ventana) activos a la vez por empleado; los más viejos se retiran solos. */
export const MAX_ACTIVE_BINDINGS = 4;

/**
 * Deja activos solo los accesos más recientes del empleado. Así un celular
 * nuevo desplaza al viejo sin aprobación, pero Safari, el ícono y la cámara del
 * MISMO iPhone (que guardan cookies por separado) no se anulan entre sí.
 * Se retira el acceso usado hace más tiempo.
 */
export async function retireOldBindings(tx: Prisma.TransactionClient, employeeId: string, reason = "Reemplazado por un acceso más reciente") {
  // Los accesos con huella o Face ID registrada no se retiran solos: la passkey
  // queda atada a ese acceso y retirarlo la dejaría inservible. Usarlos exige
  // la huella del dueño; «Cambiar código» sí los retira.
  const active = await tx.deviceBinding.findMany({
    where: { employeeId, status: "ACTIVE", passkeys: { none: {} } },
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { activatedAt: "desc" }],
    select: { id: true },
  });
  const old = active.slice(MAX_ACTIVE_BINDINGS).map((b) => b.id);
  if (old.length) await tx.deviceBinding.updateMany({ where: { id: { in: old } }, data: { status: "REVOKED", revokedAt: new Date(), revokeReason: reason } });
  return old.length;
}

/**
 * Vincula el navegador actual. La sesión ya prueba que es el empleado (entró
 * con su código o su Face ID), así que queda activo de inmediato, sin
 * aprobación del administrador.
 */
export async function bindDevice(actor: Actor, userAgent?: string | null) {
  const { companyId, employeeId } = requireEmployee(actor);
  const token = randomBytes(32).toString("base64url");
  const status = "ACTIVE" as const;
  const binding = await db.$transaction(async (tx) => {
    const b = await tx.deviceBinding.create({
      data: {
        companyId,
        employeeId,
        tokenHash: hashDeviceToken(token),
        label: deviceLabel(userAgent),
        userAgent: userAgent?.slice(0, 300),
        status,
        activatedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
    await retireOldBindings(tx, employeeId);
    await audit(
      { companyId, actorUserId: actor.userId, action: "device.bind", entityType: "device", entityId: b.id, after: { label: b.label } },
      tx,
    );
    return b;
  });
  return { token, status: binding.status, label: binding.label };
}

export async function listDevices(actor: Actor, employeeId?: string) {
  const companyId = requireCompanyAdmin(actor);
  return db.deviceBinding.findMany({
    where: { companyId, ...(employeeId ? { employeeId } : {}), status: { in: ["ACTIVE", "PENDING"] } },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      label: true,
      status: true,
      createdAt: true,
      lastSeenAt: true,
      employee: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { passkeys: true } },
    },
  });
}

async function getCompanyDevice(companyId: string, id: string) {
  if (!z.uuid().safeParse(id).success) throw notFound("El dispositivo");
  const d = await db.deviceBinding.findFirst({ where: { id, companyId } });
  if (!d) throw notFound("El dispositivo");
  return d;
}

/** Aprueba un celular pendiente. Un empleado tiene un solo celular activo: el anterior se revoca. */
export async function approveDevice(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  const d = await getCompanyDevice(companyId, id);
  if (d.status !== "PENDING") return;
  await db.$transaction(async (tx) => {
    const previous = await tx.deviceBinding.findMany({ where: { employeeId: d.employeeId, status: "ACTIVE" }, select: { id: true } });
    await tx.deviceBinding.updateMany({
      where: { id: { in: previous.map((p) => p.id) } },
      data: { status: "REVOKED", revokedAt: new Date(), revokeReason: "Reemplazado por un celular nuevo" },
    });
    await tx.deviceBinding.update({ where: { id: d.id }, data: { status: "ACTIVE", activatedAt: new Date(), approvedById: actor.userId } });
    await audit({ companyId, actorUserId: actor.userId, action: "device.approve", entityType: "device", entityId: d.id, after: { replaced: previous.length } }, tx);
  });
}

export async function revokeDevice(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  const d = await getCompanyDevice(companyId, id);
  if (d.status === "REVOKED") return;
  await db.$transaction(async (tx) => {
    await tx.deviceBinding.update({ where: { id: d.id }, data: { status: "REVOKED", revokedAt: new Date(), revokeReason: "Revocado por el administrador" } });
    // Revocar el celular también revoca sus otras ventanas reconocidas con la huella.
    const windows = d.label.endsWith(RELINK_SUFFIX)
      ? { count: 0 }
      : await tx.deviceBinding.updateMany({
          where: { employeeId: d.employeeId, status: "ACTIVE", label: { endsWith: RELINK_SUFFIX } },
          data: { status: "REVOKED", revokedAt: new Date(), revokeReason: "Revocado junto con el celular" },
        });
    await audit({ companyId, actorUserId: actor.userId, action: "device.revoke", entityType: "device", entityId: d.id, after: { windows: windows.count } }, tx);
  });
}
