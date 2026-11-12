"use client";

import { Calculator, ClipboardCheck, Lock, Undo2 } from "lucide-react";
import { useActionState } from "react";
import { computePayrollAction, payrollStatusAction } from "@/app/admin/pre-nomina/actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";

/** Botón "Calcular / Recalcular" del período mostrado. */
export function ComputePayrollButton({ start, end, computed }: { start: string; end: string; computed: boolean }) {
  const [state, action] = useActionState(computePayrollAction.bind(null, start, end), null);
  return (
    <form action={action} className="grid gap-2">
      <SubmitButton pendingText="Calculando…">
        <Calculator aria-hidden /> {computed ? "Recalcular" : "Calcular estimación"}
      </SubmitButton>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </form>
  );
}

/** Botones del flujo del período según su estado: revisar, devolver a borrador o cerrar. */
export function PayrollStatusControls({ periodId, status, canReview }: { periodId: string; status: "DRAFT" | "REVIEWED" | "CLOSED"; canReview: boolean }) {
  const [reviewState, review] = useActionState(payrollStatusAction.bind(null, periodId, "review"), null);
  const [reopenState, reopen] = useActionState(payrollStatusAction.bind(null, periodId, "reopen"), null);
  const [closeState, close] = useActionState(payrollStatusAction.bind(null, periodId, "close"), null);
  const state = closeState ?? reopenState ?? reviewState;

  if (status === "CLOSED") return null;
  return (
    <div className="grid gap-3">
      {status === "DRAFT" && (
        <form action={review} className="grid gap-2">
          <SubmitButton variant="secondary" disabled={!canReview} pendingText="Guardando…">
            <ClipboardCheck aria-hidden /> Marcar como revisada
          </SubmitButton>
          {!canReview && <p className="text-xs text-fg-muted">Para revisarla, todos los empleados deben quedar calculados.</p>}
        </form>
      )}
      {status === "REVIEWED" && (
        <div className="grid gap-3">
          <form action={close} className="grid gap-2 rounded-xl border border-border bg-bg-subtle/60 p-4">
            <label className="flex items-start gap-3 text-sm text-fg-muted">
              <input type="checkbox" name="confirm" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
              <span>Confirmo que el contador o responsable de nómina revisó estos valores. Al cerrar, el período ya no se puede recalcular ni reabrir.</span>
            </label>
            <SubmitButton pendingText="Cerrando…" className="justify-self-start">
              <Lock aria-hidden /> Cerrar período
            </SubmitButton>
          </form>
          <form action={reopen}>
            <SubmitButton variant="ghost" size="sm" pendingText="Guardando…">
              <Undo2 aria-hidden /> Volver a borrador para corregir
            </SubmitButton>
          </form>
        </div>
      )}
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </div>
  );
}
