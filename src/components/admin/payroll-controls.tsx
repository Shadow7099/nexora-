"use client";

import { Calculator } from "lucide-react";
import { useActionState } from "react";
import { computePayrollAction } from "@/app/admin/pre-nomina/actions";
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
