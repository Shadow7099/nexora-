"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { addLaborParameterVersion, verifyLaborParameter } from "@/server/payroll";

/** Acciones del superadministrador sobre los parámetros laborales nacionales. */
const superadmin = () => requireActor({ roles: ["SUPERADMIN"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function verifyParameterAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    await verifyLaborParameter(await superadmin(), id);
    revalidatePath("/plataforma/parametros");
    return { ok: true, message: "Validado." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function addParameterVersionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const p = await addLaborParameterVersion(await superadmin(), echo(fd));
    revalidatePath("/plataforma/parametros");
    return { ok: true, message: `Nueva versión de ${p.key} cargada desde ${p.validFrom.toISOString().slice(0, 10)}. La anterior quedó cerrada el día previo.` };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}
