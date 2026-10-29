"use server";

import { revalidatePath } from "next/cache";
import { updateCompanySettings } from "@/server/company";
import { requireActor } from "@/server/current";
import { addContractVersion, createEmployee, resetEmployeePassword, setEmployeeStatus, updateEmployee } from "@/server/employees";
import { toActionState, type ActionState } from "@/server/errors";

const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
/** Devuelve lo que el usuario escribió para no obligarlo a repetirlo si hay errores. */
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function createEmployeeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await createEmployee(await admin(), echo(fd));
    revalidatePath("/admin/empleados");
    return { ok: true, data: { employeeId: r.employeeId, password: r.temporaryPassword, email: String(fd.get("email")) } };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function updateEmployeeAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateEmployee(await admin(), id, echo(fd));
    revalidatePath(`/admin/empleados/${id}`);
    return { ok: true, message: "Cambios guardados." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function addContractAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await addContractVersion(await admin(), id, echo(fd));
    revalidatePath(`/admin/empleados/${id}`);
    return { ok: true, message: "Nuevas condiciones registradas." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function setStatusAction(id: string, status: "ACTIVE" | "INACTIVE", _: ActionState): Promise<ActionState> {
  try {
    await setEmployeeStatus(await admin(), id, status);
    revalidatePath(`/admin/empleados/${id}`);
    revalidatePath("/admin/empleados");
    return { ok: true, message: status === "ACTIVE" ? "Empleado reactivado." : "Empleado desactivado. Se cerraron sus sesiones." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function resetPasswordAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    const password = await resetEmployeePassword(await admin(), id);
    return { ok: true, data: { password } };
  } catch (e) {
    return toActionState(e);
  }
}

export async function updateSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateCompanySettings(await admin(), {
      lateToleranceMin: fd.get("lateToleranceMin"),
      geoMaxAccuracyM: fd.get("geoMaxAccuracyM"),
      requireDeviceBinding: fd.get("requireDeviceBinding") === "on",
    });
    revalidatePath("/admin/configuracion");
    return { ok: true, message: "Configuración guardada." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}
