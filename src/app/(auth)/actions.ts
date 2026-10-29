"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { fieldErrors, loginSchema, passwordSchema } from "@/lib/validation";
import type { ActionState } from "@/server/errors";
import { clearSessionCookie, getSessionToken, getUserAgent, requireActor, setSessionCookie } from "@/server/current";
import { authenticate, changePassword, homeFor, recordConsent, revokeSession } from "@/server/sessions";

/** Solo se acepta un destino interno (evita redirecciones abiertas a otros sitios). */
function safeNext(next: unknown, role: Parameters<typeof homeFor>[0]) {
  const home = homeFor(role);
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return home;
  return next.startsWith(home) ? next : home;
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), data: { email: String(formData.get("email") ?? "") } };

  let result: Awaited<ReturnType<typeof authenticate>>;
  try {
    result = await authenticate(parsed.data.email, parsed.data.password, await getUserAgent());
  } catch (e) {
    // Fallo de infraestructura (p. ej. base de datos no configurada o caída): mensaje claro, sin detalles internos.
    console.error("login: error de infraestructura", e);
    return { ok: false, message: "El servicio no está disponible en este momento. Intenta en unos minutos.", data: { email: parsed.data.email } };
  }
  if (!result.ok) {
    const message =
      result.reason === "locked"
        ? `Por seguridad bloqueamos la cuenta durante ${result.minutes} min. Intenta más tarde o pide ayuda a tu administrador.`
        : "Correo o contraseña incorrectos.";
    return { ok: false, message, data: { email: parsed.data.email } };
  }

  await setSessionCookie(result.token, result.expiresAt);
  redirect(result.mustChangePassword ? "/cambiar-clave" : safeNext(formData.get("next"), result.role));
}

export async function logoutAction() {
  const token = await getSessionToken();
  if (token) await revokeSession(token);
  await clearSessionCookie();
  redirect("/ingresar");
}

export async function consentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireActor({ allowPending: true });
  if (formData.get("accept") !== "on") return { ok: false, message: "Para continuar debes aceptar la autorización." };
  await recordConsent(actor, await getUserAgent());
  redirect(actor.mustChangePassword ? "/cambiar-clave" : homeFor(actor.role));
}

const changeSchema = z
  .object({ current: z.string().min(1, { error: "Escribe tu contraseña actual." }), next: passwordSchema, confirm: z.string() })
  .refine((v) => v.next === v.confirm, { error: "Las contraseñas no coinciden.", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { error: "Debe ser distinta de la actual.", path: ["next"] });

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireActor({ allowPending: true });
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const r = await changePassword(actor, parsed.data.current, parsed.data.next);
  if (!r.ok) {
    return r.field === "current"
      ? { ok: false, fieldErrors: { current: "La contraseña actual no es correcta." } }
      : { ok: false, fieldErrors: { next: "No uses tu correo dentro de la contraseña." } };
  }
  redirect(actor.hasConsent ? homeFor(actor.role) : "/autorizacion");
}
