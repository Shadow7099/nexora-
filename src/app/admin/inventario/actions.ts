"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { createProduct, recordMovement, setProductActive, updateProduct } from "@/server/inventory";

/** Acciones del inventario. Cada una vuelve a verificar sesión y rol; la empresa sale de la sesión. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function createProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await createProduct(await admin(), echo(fd))).id;
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
  revalidatePath("/admin/inventario");
  redirect(`/admin/inventario/${id}?creado=1`);
}

export async function updateProductAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateProduct(await admin(), id, echo(fd));
    revalidatePath("/admin/inventario", "layout");
    return { ok: true, message: "Producto guardado." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function setProductActiveAction(id: string, active: boolean): Promise<ActionState> {
  try {
    await setProductActive(await admin(), id, active);
    revalidatePath("/admin/inventario", "layout");
    return { ok: true, message: active ? "Producto activado." : "Producto desactivado: ya no aparece en la lista ni se puede mover." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function movementAction(productId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await recordMovement(await admin(), { ...echo(fd), productId });
    revalidatePath("/admin/inventario", "layout");
    return { ok: true, message: `Movimiento registrado. Stock en la sede: ${r.before} → ${r.after}.` };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}
