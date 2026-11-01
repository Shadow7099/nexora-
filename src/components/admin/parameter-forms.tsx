"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { addParameterVersionAction, verifyParameterAction } from "@/app/plataforma/actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Marca un parámetro como validado (después de la revisión del contador). */
export function VerifyParameterButton({ id, label }: { id: string; label: string }) {
  const [state, action] = useActionState(verifyParameterAction.bind(null, id), null);
  if (state?.ok) return <span className="text-xs text-success" role="status">Validado</span>;
  return (
    <form action={action} className="grid justify-items-end gap-1">
      <SubmitButton size="sm" variant="secondary" pendingText="Validando…" aria-label={`Marcar como validado: ${label}`}>
        <Check aria-hidden /> Validar
      </SubmitButton>
      {state?.message && <span className="text-xs text-danger" role="alert">{state.message}</span>}
    </form>
  );
}

/** Carga una nueva versión de un parámetro desde una fecha (la anterior se cierra el día previo). */
export function ParameterVersionForm({ options }: { options: { key: string; label: string }[] }) {
  const [state, action] = useActionState(addParameterVersionAction, null);
  const err = state?.fieldErrors ?? {};
  const data = state?.ok ? {} : (state?.data ?? {});
  return (
    <form action={action} className="grid gap-4" noValidate key={state?.ok ? state.message : "form"}>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Field id="key" label="Parámetro" error={err.key}>
          <Select id="key" name="key" defaultValue={data.key ?? ""} aria-invalid={!!err.key || undefined}>
            <option value="" disabled>Elige…</option>
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Select>
        </Field>
        <Field id="value" label="Valor" error={err.value} hint="Porcentaje: 35 = 35 %. Hora: minutos (19:00 = 1140).">
          <Input id="value" name="value" inputMode="decimal" defaultValue={data.value} aria-invalid={!!err.value || undefined} />
        </Field>
        <Field id="validFrom" label="Vigente desde" error={err.validFrom}>
          <Input id="validFrom" name="validFrom" type="date" defaultValue={data.validFrom} aria-invalid={!!err.validFrom || undefined} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="legalSource" label="Norma" error={err.legalSource} hint="Ej.: Decreto 0159 de 2026, art. 1">
          <Input id="legalSource" name="legalSource" defaultValue={data.legalSource} aria-invalid={!!err.legalSource || undefined} />
        </Field>
        <Field id="sourceUrl" label="URL oficial" error={err.sourceUrl}>
          <Input id="sourceUrl" name="sourceUrl" type="url" defaultValue={data.sourceUrl} aria-invalid={!!err.sourceUrl || undefined} />
        </Field>
      </div>
      <Field id="notes" label="Notas (opcional)" error={err.notes}>
        <Input id="notes" name="notes" defaultValue={data.notes} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando…">Cargar versión</SubmitButton>
      </div>
    </form>
  );
}
