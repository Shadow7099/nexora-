"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { removeIntegration, saveIntegration, testIntegration, type IntegrationScope } from "@/server/integrations";

/**
 * Acciones de Integraciones. Cada una vuelve a verificar sesión y rol: la
 * empresa sale de la sesión (nunca del navegador) y la plataforma exige
 * superadministrador.
 */
const actorFor = (scope: IntegrationScope) => requireActor({ roles: [scope === "platform" ? "SUPERADMIN" : "COMPANY_ADMIN"] });
const pathFor = (scope: IntegrationScope) => (scope === "platform" ? "/plataforma/integraciones" : "/admin/integraciones");

export async function saveIntegrationAction(scope: IntegrationScope, provider: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const input = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
    await saveIntegration(await actorFor(scope), scope, provider, input);
    revalidatePath(pathFor(scope));
    return { ok: true, message: "Guardado. Ahora toca «Probar conexión»." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function testIntegrationAction(scope: IntegrationScope, provider: string): Promise<ActionState> {
  try {
    const r = await testIntegration(await actorFor(scope), scope, provider);
    revalidatePath(pathFor(scope));
    return r.ok ? { ok: true, message: `Conexión correcta: ${r.detail}` } : { ok: false, message: r.error };
  } catch (e) {
    return toActionState(e);
  }
}

export async function removeIntegrationAction(scope: IntegrationScope, provider: string): Promise<ActionState> {
  try {
    await removeIntegration(await actorFor(scope), scope, provider);
    revalidatePath(pathFor(scope));
    return { ok: true, message: "Desconectado. Se borraron los datos y tokens guardados." };
  } catch (e) {
    return toActionState(e);
  }
}
