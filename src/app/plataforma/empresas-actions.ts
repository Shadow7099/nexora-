"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { createCompany, resetCompanyAdminPassword, setCompanyStatus } from "@/server/platform";

/** Acciones del superadministrador sobre empresas. Cada una vuelve a verificar sesión y rol. */
const superadmin = () => requireActor({ roles: ["SUPERADMIN"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function createCompanyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await createCompany(await superadmin(), echo(fd));
    revalidatePath("/plataforma");
    return { ok: true, message: "Empresa creada en modo prueba.", data: { companyId: r.companyId, email: r.adminEmail, password: r.temporaryPassword } };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function setCompanyStatusAction(id: string, status: string, _: ActionState): Promise<ActionState> {
  try {
    await setCompanyStatus(await superadmin(), id, status);
    revalidatePath(`/plataforma/empresas/${id}`);
    revalidatePath("/plataforma");
    return { ok: true, message: status === "SUSPENDED" ? "Empresa suspendida: sus usuarios ya no pueden ingresar." : "Estado actualizado." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function resetAdminPasswordAction(companyId: string, userId: string, _: ActionState): Promise<ActionState> {
  try {
    const r = await resetCompanyAdminPassword(await superadmin(), companyId, userId);
    return { ok: true, data: { email: r.email, password: r.temporaryPassword } };
  } catch (e) {
    return toActionState(e);
  }
}
