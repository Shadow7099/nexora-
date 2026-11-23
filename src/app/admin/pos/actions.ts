"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";

/** Acciones del punto de venta. Cada una vuelve a verificar sesión y rol; la empresa sale de la sesión. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
const refresh = () => {
  revalidatePath("/admin/pos");
  revalidatePath("/admin/pos/catalogo");
};

export async function checkoutAction(input: { siteId: string; method: string; items: { productId: string; quantity: number }[]; received?: number }) {
  const { posCheckout } = await import("@/server/pos");
  try {
    const r = await posCheckout(await admin(), input);
    refresh();
    revalidatePath("/admin/ventas");
    revalidatePath("/admin/caja");
    return { ok: true as const, id: r.id, label: r.label, total: r.total, change: r.change };
  } catch (e) {
    return { ok: false as const, message: toActionState(e)?.message ?? "No se pudo cobrar." };
  }
}

export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { savePosCategory } = await import("@/server/pos");
  try {
    await savePosCategory(await admin(), { id: fd.get("id"), name: fd.get("name"), parentId: fd.get("parentId"), color: fd.get("color"), icon: fd.get("icon") });
    refresh();
    return { ok: true, message: "Categoría guardada." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function hideCategoryAction(id: string): Promise<ActionState> {
  const { hidePosCategory } = await import("@/server/pos");
  try {
    await hidePosCategory(await admin(), id);
    refresh();
    return { ok: true, message: "Categoría quitada del punto de venta." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function createFamilyAction(input: unknown): Promise<ActionState> {
  const { createPosFamily } = await import("@/server/pos");
  try {
    const r = await createPosFamily(await admin(), input);
    refresh();
    revalidatePath("/admin/inventario");
    return { ok: true, message: `Listo: ${r.created} producto${r.created === 1 ? "" : "s"} creado${r.created === 1 ? "" : "s"} en el inventario.` };
  } catch (e) {
    return toActionState(e);
  }
}

export async function loadYarnShopAction(): Promise<ActionState> {
  const { loadYarnShop } = await import("@/server/pos");
  try {
    const r = await loadYarnShop(await admin());
    refresh();
    revalidatePath("/admin/inventario");
    return { ok: true, message: `Tienda de hilos cargada: ${r.variants} productos con su stock.` };
  } catch (e) {
    return toActionState(e);
  }
}
