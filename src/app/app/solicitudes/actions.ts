"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { cancelNovelty, requestNovelty } from "@/server/novelties";
import { addOvertimeNote } from "@/server/overtime";

const employee = () => requireActor({ roles: ["EMPLOYEE"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function requestNoveltyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requestNovelty(await employee(), echo(fd));
    revalidatePath("/app/solicitudes");
    return { ok: true, message: "Solicitud enviada. Te avisaremos cuando la revisen." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function cancelNoveltyAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    await cancelNovelty(await employee(), id);
    revalidatePath("/app/solicitudes");
    return { ok: true };
  } catch (e) {
    return toActionState(e);
  }
}

export async function overtimeNoteAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await addOvertimeNote(await employee(), id, String(fd.get("note") ?? ""));
    revalidatePath("/app/solicitudes");
    return { ok: true, message: "Explicación enviada." };
  } catch (e) {
    return toActionState(e);
  }
}
