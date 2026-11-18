"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addActivity, completeActivity, createCustomer, createDeal, moveDeal, updateCustomer } from "@/server/crm";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";

/** Acciones del CRM. Cada una vuelve a verificar sesión y rol; la empresa sale de la sesión. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
const refresh = () => revalidatePath("/admin/crm", "layout");

export async function createCustomerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await createCustomer(await admin(), echo(fd))).id;
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
  refresh();
  redirect(`/admin/crm/clientes/${id}`);
}

export async function updateCustomerAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateCustomer(await admin(), id, echo(fd));
    refresh();
    return { ok: true, message: "Cliente guardado." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function createDealAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await createDeal(await admin(), echo(fd));
    refresh();
    return { ok: true, message: "Oportunidad creada." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function moveDealAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await moveDeal(await admin(), id, fd.get("stage"), fd.get("lostReason"));
    refresh();
    return { ok: true, message: "Etapa actualizada." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function addActivityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await addActivity(await admin(), echo(fd));
    refresh();
    return { ok: true, message: "Seguimiento registrado." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function completeTaskAction(id: string): Promise<ActionState> {
  try {
    await completeActivity(await admin(), id);
    refresh();
    return { ok: true, message: "Tarea completada." };
  } catch (e) {
    return toActionState(e);
  }
}
