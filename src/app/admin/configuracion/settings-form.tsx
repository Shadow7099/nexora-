"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/admin/actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";

export function SettingsForm({ values }: { values: { lateToleranceMin: number; geoMaxAccuracyM: number; requireDeviceBinding: boolean; parafiscalExempt: boolean } }) {
  const [state, action] = useActionState(updateSettingsAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lateToleranceMin" label="Tolerancia de llegada (minutos)" error={err.lateToleranceMin} hint="Llegar dentro de este margen no cuenta como tarde.">
          <Input id="lateToleranceMin" name="lateToleranceMin" inputMode="numeric" defaultValue={values.lateToleranceMin} aria-invalid={!!err.lateToleranceMin || undefined} />
        </Field>
        <Field id="geoMaxAccuracyM" label="Precisión mínima del GPS (metros)" error={err.geoMaxAccuracyM} hint="Con menor precisión, la marcación queda para revisar.">
          <Input id="geoMaxAccuracyM" name="geoMaxAccuracyM" inputMode="numeric" defaultValue={values.geoMaxAccuracyM} aria-invalid={!!err.geoMaxAccuracyM || undefined} />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
        <input type="checkbox" name="requireDeviceBinding" defaultChecked={values.requireDeviceBinding} className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span>
          <span className="font-medium">Exigir celular vinculado para marcar</span>
          <span className="block text-fg-muted">Recomendado. Cada empleado marca solo desde su propio celular; un celular nuevo requiere tu aprobación.</span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
        <input type="checkbox" name="parafiscalExempt" defaultChecked={values.parafiscalExempt} className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span>
          <span className="font-medium">La empresa aplica la exoneración del art. 114-1 del Estatuto Tributario</span>
          <span className="block text-fg-muted">
            Sociedades y personas jurídicas declarantes de renta (o personas naturales con dos o más empleados) no pagan salud del empleador, SENA ni
            ICBF por los trabajadores que devenguen menos de 10 salarios mínimos. Confírmalo con tu contador: cambia el costo estimado de la pre-nómina.
          </span>
        </span>
      </label>
      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
      </div>
    </form>
  );
}
