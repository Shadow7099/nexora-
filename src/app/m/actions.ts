"use server";

import { revalidatePath } from "next/cache";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { punch } from "@/server/attendance";
import { getDeviceToken, getRelyingParty, getUserAgent, requireActor, setDeviceCookie } from "@/server/current";
import { bindDevice, findBinding } from "@/server/devices";
import { AppError } from "@/server/errors";
import { passkeyAuthenticationOptions, passkeyRegistrationOptions, registerPasskey } from "@/server/passkeys";

const employee = () => requireActor({ roles: ["EMPLOYEE"] });

export async function bindDeviceAction() {
  const actor = await employee();
  const r = await bindDevice(actor, await getUserAgent());
  await setDeviceCookie(r.token);
  revalidatePath("/app");
  return { status: r.status, label: r.label };
}

/** Opciones de la passkey para confirmar una marcación (null si este celular no tiene). */
export async function punchPasskeyOptionsAction() {
  const actor = await employee();
  const binding = await findBinding(actor.employeeId!, await getDeviceToken());
  if (!binding || binding.status !== "ACTIVE") return null;
  return passkeyAuthenticationOptions(actor, binding.id, await getRelyingParty());
}

export type PunchActionResult =
  | { ok: true; type: "IN" | "OUT"; at: string; siteName: string; flagged: boolean; workedMinutes?: number; staleClosed?: boolean }
  | { ok: false; message: string };

export async function punchAction(
  input: { publicCode: string; idempotencyKey: string; position: { lat: number; lng: number; accuracy: number } | null },
  passkeyResponse?: AuthenticationResponseJSON,
): Promise<PunchActionResult> {
  const actor = await employee();
  const r = await punch(actor, input, {
    deviceToken: await getDeviceToken(),
    passkeyResponse,
    rp: await getRelyingParty(),
    userAgent: await getUserAgent(),
  });
  revalidatePath("/app");
  revalidatePath("/app/historial");
  return r.ok ? { ...r, at: r.at.toISOString() } : { ok: false, message: r.message };
}

export async function passkeyRegistrationOptionsAction() {
  const actor = await employee();
  try {
    const { options } = await passkeyRegistrationOptions(actor, await getDeviceToken(), await getRelyingParty());
    return { ok: true as const, options };
  } catch (e) {
    return { ok: false as const, message: e instanceof AppError ? e.message : "No se pudo iniciar el registro." };
  }
}

export async function registerPasskeyAction(response: RegistrationResponseJSON) {
  const actor = await employee();
  try {
    await registerPasskey(actor, await getDeviceToken(), response, await getRelyingParty());
    revalidatePath("/app");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, message: e instanceof AppError ? e.message : "No se pudo activar la huella." };
  }
}
