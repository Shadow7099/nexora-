"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { computePayroll, setPayrollStatus, type PayrollAction } from "@/server/payroll";

/** Calcula o recalcula la pre-nómina estimada del período. Vuelve a verificar sesión y rol. */
export async function computePayrollAction(start: string, end: string, _: ActionState): Promise<ActionState> {
  try {
    const r = await computePayroll(await requireActor({ roles: ["COMPANY_ADMIN"] }), { start, end });
    revalidatePath("/admin/pre-nomina");
    const blocked = r.blocked ? ` ${r.blocked} sin calcular por falta de datos (revisa las advertencias).` : "";
    return { ok: true, message: `Estimación calculada para ${r.employees} empleado(s).${blocked}` };
  } catch (e) {
    return toActionState(e);
  }
}

const DONE = { review: "Período marcado como revisado.", reopen: "El período volvió a borrador: ya puedes recalcular.", close: "Período cerrado. Ya puedes descargar los comprobantes definitivos." } as const;

/** Revisar, devolver a borrador o cerrar el período. Cerrar exige confirmar explícitamente. */
export async function payrollStatusAction(periodId: string, action: PayrollAction, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    if (action === "close" && form.get("confirm") !== "on") return { ok: false, message: "Marca la casilla para confirmar el cierre." };
    await setPayrollStatus(await requireActor({ roles: ["COMPANY_ADMIN"] }), periodId, action);
    revalidatePath("/admin/pre-nomina", "layout");
    return { ok: true, message: DONE[action] };
  } catch (e) {
    return toActionState(e);
  }
}
