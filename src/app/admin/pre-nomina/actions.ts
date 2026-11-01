"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { computePayroll } from "@/server/payroll";

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
