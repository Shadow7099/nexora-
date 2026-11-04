"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { assignWeeklySchedule, completeOnboarding, createEmployeesBulk, createPresetTemplates } from "@/server/onboarding";
import { createSite } from "@/server/sites";

/** Acciones del asistente de configuración inicial. Cada una vuelve a verificar sesión y rol. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
const WIZARD = "/admin/bienvenida";

export async function wizardSiteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await createSite(await admin(), { ...echo(fd), days: fd.getAll("days").map(Number) });
  } catch (e) {
    return { ...toActionState(e), data: echo(fd) };
  }
  revalidatePath("/admin", "layout");
  redirect(`${WIZARD}?paso=turnos`);
}

export async function wizardPresetsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await createPresetTemplates(await admin(), fd.getAll("presets").map(String));
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath("/admin", "layout");
  redirect(`${WIZARD}?paso=empleados`);
}

export async function wizardEmployeesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const keep = echo(fd);
  try {
    const r = await createEmployeesBulk(await admin(), fd.get("lines"), keep);
    revalidatePath("/admin", "layout");
    return {
      ok: r.created.length > 0,
      message: r.failed.length ? `${r.failed.length} línea(s) no se pudieron crear. Corrígelas y vuelve a enviarlas.` : undefined,
      // Las líneas con error vuelven al cuadro de texto para corregirlas.
      data: { ...keep, lines: r.failed.map((f) => f.text).join("\n"), result: JSON.stringify(r) },
    };
  } catch (e) {
    return { ...toActionState(e), data: keep };
  }
}

export async function wizardScheduleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await assignWeeklySchedule(await admin(), {
      templateId: fd.get("templateId"),
      weekdays: fd.getAll("weekdays").map(Number),
      employeeIds: fd.getAll("employeeIds").map(String),
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Horario asignado a ${r.assigned} empleado(s), vigente desde hoy.` };
  } catch (e) {
    return toActionState(e);
  }
}

export async function finishOnboardingAction() {
  await completeOnboarding(await admin());
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
