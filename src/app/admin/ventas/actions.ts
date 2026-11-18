"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { createSale, voidSale } from "@/server/sales";

/** Acciones de ventas. Cada una vuelve a verificar sesión y rol; la empresa sale de la sesión. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });

/** La venta llega como JSON (renglones dinámicos) en el campo «payload». */
export async function createSaleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    let payload: unknown;
    try {
      payload = JSON.parse(String(fd.get("payload") ?? ""));
    } catch {
      return { ok: false, message: "No se pudo leer la venta. Recarga la página e intenta de nuevo." };
    }
    id = (await createSale(await admin(), payload)).id;
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/caja");
  revalidatePath("/admin/inventario", "layout");
  redirect(`/admin/ventas/${id}?nueva=1`);
}

export async function voidSaleAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await voidSale(await admin(), id, fd.get("reason"));
    revalidatePath("/admin/ventas", "layout");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/inventario", "layout");
    return { ok: true, message: "Venta anulada: se devolvió el inventario y se anuló el ingreso de caja." };
  } catch (e) {
    return toActionState(e);
  }
}
