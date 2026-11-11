"use server";

import { getClientIp } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { submitLead } from "@/server/leads";

/** Formulario público «Solicita tu invitación». */
export async function submitLeadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const data = Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  try {
    await submitLead({ ...data, consent: fd.get("consent") === "on" }, await getClientIp());
    return { ok: true, message: "¡Listo! Recibimos tu solicitud. Te contactaremos para enviarte tu link de registro." };
  } catch (e) {
    return { ...toActionState(e), data };
  }
}
