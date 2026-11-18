"use server";

import { revalidatePath } from "next/cache";
import { addCashMovement, closeCashDay, reopenCashDay, voidCashMovement } from "@/server/cash";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";

/** Acciones de la caja. Cada una vuelve a verificar sesión y rol; la empresa sale de la sesión. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function cashMovementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const m = await addCashMovement(await admin(), echo(fd));
    revalidatePath("/admin/caja");
    return { ok: true, message: `${m.type === "IN" ? "Ingreso" : "Egreso"} registrado.` };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function voidCashAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await voidCashMovement(await admin(), id, fd.get("reason"));
    revalidatePath("/admin/caja");
    return { ok: true, message: "Movimiento anulado." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function closeCashAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await closeCashDay(await admin(), echo(fd));
    revalidatePath("/admin/caja");
    return { ok: true, message: r.difference === 0 ? "Día cerrado. La caja cuadró." : "Día cerrado con diferencia." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function reopenCashAction(closingId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await reopenCashDay(await admin(), closingId, fd.get("reason"));
    revalidatePath("/admin/caja");
    return { ok: true, message: "Día reabierto." };
  } catch (e) {
    return toActionState(e);
  }
}
