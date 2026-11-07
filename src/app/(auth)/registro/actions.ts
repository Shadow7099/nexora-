"use server";

import { redirect } from "next/navigation";
import { getUserAgent, setSessionCookie } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { registerWithInvitation } from "@/server/registration";

/** Registro con invitación: crea la empresa y la cuenta, inicia sesión y lleva a «Primeros pasos». */
export async function registerAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const data = Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  let session: Awaited<ReturnType<typeof registerWithInvitation>>;
  try {
    session = await registerWithInvitation(token, { ...data, terms: fd.get("terms") === "on" }, await getUserAgent());
  } catch (e) {
    const { password: _p, confirm: _c, ...echo } = data;
    return { ...toActionState(e), data: echo };
  }
  await setSessionCookie(session.token, session.expiresAt);
  // Primero acepta la autorización de datos; luego entra a la guía de configuración.
  redirect(`/autorizacion?next=${encodeURIComponent("/admin/primeros-pasos")}`);
}
