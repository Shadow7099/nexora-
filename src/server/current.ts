import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { homeFor, validateSessionToken, type Actor } from "@/server/sessions";

const secure = process.env.NODE_ENV === "production";
/** En producción el prefijo __Host- obliga a HTTPS, ruta "/" y sin dominio (no se comparte con subdominios). */
export const SESSION_COOKIE = secure ? "__Host-nexora_session" : "nexora_session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getUserAgent() {
  return (await headers()).get("user-agent");
}

/** Actor de la solicitud actual (una sola consulta por render gracias a cache). */
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const token = await getSessionToken();
  return token ? validateSessionToken(token) : null;
});

/**
 * Exige sesión válida y, opcionalmente, un rol. Además fuerza los pasos
 * pendientes: cambio de contraseña inicial y autorización de datos.
 */
export async function requireActor(opts: { roles?: Role[]; allowPending?: boolean } = {}): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/ingresar");
  if (!opts.allowPending) {
    if (actor.mustChangePassword) redirect("/cambiar-clave");
    if (!actor.hasConsent) redirect("/autorizacion");
  }
  if (opts.roles && !opts.roles.includes(actor.role)) redirect(homeFor(actor.role));
  return actor;
}

/** Cookie del dispositivo vinculado: larga duración (los navegadores limitan a ~400 días). */
export const DEVICE_COOKIE = secure ? "__Host-nexora_device" : "nexora_device";

export async function getDeviceToken() {
  return (await cookies()).get(DEVICE_COOKIE)?.value;
}

export async function setDeviceCookie(token: string) {
  (await cookies()).set(DEVICE_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 400 * 24 * 60 * 60 });
}

/**
 * Identidad del sitio para passkeys (WebAuthn): el dominio desde el que se usa la app.
 * APP_URL fija el dominio en producción; si no está, se toma de la solicitud.
 */
export async function getRelyingParty() {
  const fromEnv = process.env.APP_URL ? new URL(process.env.APP_URL) : null;
  if (fromEnv) return { rpID: fromEnv.hostname, origin: fromEnv.origin };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { rpID: host.split(":")[0]!, origin: `${proto}://${host}` };
}
