"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/current";
import { addManualSession, closeSessionManually } from "@/server/corrections";
import { toActionState, type ActionState } from "@/server/errors";
import { decideNovelty, registerNovelty } from "@/server/novelties";
import { decideOvertime } from "@/server/overtime";
import { clearOverride, saveTemplate, setOverride, setPattern, setTemplateActive } from "@/server/schedules";
import { createSite, rotateQr, setSiteActive, updateSite } from "@/server/sites";

/** Acciones de gestión del administrador (fases 3 y 5). Cada una vuelve a verificar sesión y rol. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
const siteInput = (fd: FormData) => ({ ...echo(fd), days: fd.getAll("days").map(Number) });

// ── Sedes ──
export async function createSiteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await createSite(await admin(), siteInput(fd))).id;
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
  revalidatePath("/admin/sedes");
  redirect(`/admin/sedes/${id}?creada=1`);
}

export async function updateSiteAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateSite(await admin(), id, siteInput(fd));
    revalidatePath("/admin/sedes");
    return { ok: true, message: "Sede guardada." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function rotateQrAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    const qr = await rotateQr(await admin(), id);
    revalidatePath(`/admin/sedes/${id}`);
    revalidatePath("/admin/sedes");
    return { ok: true, message: `QR rotado (versión ${qr.version}). El anterior ya no funciona: imprime y pega el nuevo.` };
  } catch (e) {
    return toActionState(e);
  }
}

export async function setSiteActiveAction(id: string, active: boolean, _: ActionState): Promise<ActionState> {
  try {
    await setSiteActive(await admin(), id, active);
    revalidatePath(`/admin/sedes/${id}`);
    revalidatePath("/admin/sedes");
    return { ok: true, message: active ? "Sede activada." : "Sede desactivada. Su QR deja de registrar asistencia." };
  } catch (e) {
    return toActionState(e);
  }
}

// ── Horarios ──
export async function saveTemplateAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await saveTemplate(await admin(), id, { ...echo(fd), breakPaid: fd.get("breakPaid") === "on" });
    revalidatePath("/admin/horarios");
    return { ok: true, message: id ? "Plantilla guardada." : "Plantilla creada." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function setTemplateActiveAction(id: string, active: boolean, _: ActionState): Promise<ActionState> {
  try {
    await setTemplateActive(await admin(), id, active);
    revalidatePath("/admin/horarios");
    return { ok: true };
  } catch (e) {
    return toActionState(e);
  }
}

export async function setPatternAction(employeeId: string, input: unknown): Promise<ActionState> {
  try {
    await setPattern(await admin(), employeeId, input);
    revalidatePath("/admin/horarios");
    revalidatePath(`/admin/horarios/${employeeId}`);
    return { ok: true, message: "Horario guardado." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function setOverrideAction(employeeId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await setOverride(await admin(), employeeId, echo(fd));
    revalidatePath(`/admin/horarios/${employeeId}`);
    revalidatePath("/admin/horarios");
    return { ok: true, message: "Cambio guardado." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function clearOverrideAction(employeeId: string, date: string, _: ActionState): Promise<ActionState> {
  try {
    await clearOverride(await admin(), employeeId, date);
    revalidatePath(`/admin/horarios/${employeeId}`);
    revalidatePath("/admin/horarios");
    return { ok: true };
  } catch (e) {
    return toActionState(e);
  }
}

// ── Solicitudes ──
export async function decideOvertimeAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const decision = fd.get("decision");
    await decideOvertime(await admin(), id, { decision, approvedMinutes: fd.get("approvedMinutes"), note: String(fd.get("note") ?? "") });
    // Sin revalidar: la tarjeta muestra el resultado donde se hizo clic (la lista se actualiza al volver).
    return { ok: true, message: decision === "approve" ? "Horas extra aprobadas." : "Horas extra rechazadas. El tiempo registrado no cambia." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function decideNoveltyAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const decision = fd.get("decision") === "approve" ? "approve" : "reject";
    await decideNovelty(await admin(), id, decision, String(fd.get("note") ?? ""));
    // Sin revalidar: la tarjeta muestra el resultado donde se hizo clic (la lista se actualiza al volver).
    return { ok: true, message: decision === "approve" ? "Novedad aprobada." : "Novedad rechazada." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function registerNoveltyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await registerNovelty(await admin(), String(fd.get("employeeId") ?? ""), echo(fd));
    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asistencia");
    return { ok: true, message: "Novedad registrada." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function closeSessionAction(sessionId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await closeSessionManually(await admin(), sessionId, { endTime: fd.get("endTime"), nextDay: fd.get("nextDay") === "on", reason: fd.get("reason") });
    // Sin revalidar: la tarjeta muestra el resultado donde se hizo clic (la lista se actualiza al volver).
    revalidatePath("/admin/asistencia");
    return { ok: true, message: "Salida registrada como corrección." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function addManualSessionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await addManualSession(await admin(), String(fd.get("employeeId") ?? ""), echo(fd));
    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asistencia");
    return { ok: true, message: "Jornada agregada como corrección." };
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
}

export async function scanOvertimeAction(_: ActionState): Promise<ActionState> {
  try {
    const actor = await admin();
    const { scanOvertime } = await import("@/server/overtime");
    const n = await scanOvertime(actor.companyId!);
    revalidatePath("/admin/solicitudes");
    return { ok: true, message: n > 0 ? `Se detectaron horas extra en ${n} días.` : "No hay horas extra nuevas por detectar." };
  } catch (e) {
    return toActionState(e);
  }
}
