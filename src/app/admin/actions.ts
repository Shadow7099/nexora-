"use server";

import { revalidatePath } from "next/cache";
import { updateCompanySettings } from "@/server/company";
import { requireActor } from "@/server/current";
import { addContractVersion, createEmployee, setEmployeeStatus, updateEmployee } from "@/server/employees";
import { toActionState, type ActionState } from "@/server/errors";

const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
/** Devuelve lo que el usuario escribió para no obligarlo a repetirlo si hay errores. */
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function createEmployeeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await createEmployee(await admin(), echo(fd));
    revalidatePath("/admin/empleados");
    return { ok: true, data: { employeeId: r.employeeId, code: r.accessCode, email: String(fd.get("email")), phone: String(fd.get("phone") ?? ""), name: String(fd.get("firstName") ?? "") } };
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

export async function regenerateAccessCodeAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    const { regenerateAccessCode } = await import("@/server/activation");
    const code = await regenerateAccessCode(await admin(), id);
    revalidatePath(`/admin/empleados/${id}`);
    return { ok: true, message: "Código cambiado. El anterior ya no sirve y se cerraron sus sesiones.", data: { code } };
  } catch (e) {
    return toActionState(e);
  }
}

export async function requirePasskeyAction(id: string, required: boolean, _: ActionState): Promise<ActionState> {
  try {
    const { setRequirePasskey } = await import("@/server/activation");
    await setRequirePasskey(await admin(), id, required);
    revalidatePath(`/admin/empleados/${id}`);
    return { ok: true, message: required ? "Ahora debe marcar con Face ID o huella." : "Face ID o huella ahora es opcional para este empleado." };
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
      parafiscalExempt: fd.get("parafiscalExempt") === "on",
    });
    revalidatePath("/admin/configuracion");
    return { ok: true, message: "Configuración guardada." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function approveDeviceAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    const { approveDevice } = await import("@/server/devices");
    await approveDevice(await admin(), id);
    // Sin revalidar la página: el resultado queda visible donde se hizo clic (la lista se actualiza al volver).
    return { ok: true, message: "Celular aprobado. El anterior quedó desvinculado." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function revokeDeviceAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    const { revokeDevice } = await import("@/server/devices");
    await revokeDevice(await admin(), id);
    return { ok: true, message: "Celular desvinculado." };
  } catch (e) {
    return toActionState(e);
  }
}


/** Excepción: permitir (o volver a exigir) que este celular marque sin huella ni Face ID. */
export async function passkeyExemptionAction(id: string, allow: boolean, _: ActionState): Promise<ActionState> {
  try {
    const { setPasskeyExemption } = await import("@/server/devices");
    await setPasskeyExemption(await admin(), id, allow);
    revalidatePath("/admin/empleados", "layout");
    return { ok: true, message: allow ? "Este celular puede marcar sin huella ni Face ID." : "Este celular vuelve a exigir huella o Face ID." };
  } catch (e) {
    return toActionState(e);
  }
}
