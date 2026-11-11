"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { submitLeadAction } from "@/app/landing-actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** «Solicita tu invitación»: los datos llegan a Plataforma → Solicitudes. */
export function LeadForm() {
  const [state, action] = useActionState(submitLeadAction, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-success/30 bg-success-soft px-6 py-10 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p className="max-w-sm font-medium text-fg">{state.message}</p>
      </div>
    );
  }
  const err = state?.fieldErrors ?? {};
  const v = state?.data ?? {};
  const field = (id: string, label: string, props: React.ComponentProps<"input"> = {}) => (
    <Field id={`lead-${id}`} label={label} error={err[id]}>
      <Input id={`lead-${id}`} name={id} defaultValue={v[id]} aria-invalid={!!err[id] || undefined} {...props} />
    </Field>
  );
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("businessName", "Nombre del negocio", { autoComplete: "organization" })}
        {field("contactName", "Tu nombre", { autoComplete: "name" })}
        {field("email", "Correo", { type: "email", autoComplete: "email" })}
        {field("phone", "Celular / WhatsApp", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
        <Field id="lead-employees" label="¿Cuántos empleados?" error={err.employees}>
          <Select id="lead-employees" name="employees" defaultValue={v.employees ?? ""} aria-invalid={!!err.employees || undefined}>
            <option value="" disabled>Elige…</option>
            <option value="1-5">1 a 5</option>
            <option value="6-15">6 a 15</option>
            <option value="16-30">16 a 30</option>
            <option value="31+">Más de 30</option>
          </Select>
        </Field>
        {field("sites", "¿Cuántas sedes? (opcional)", { inputMode: "numeric" })}
        {field("city", "Ciudad (opcional)", { autoComplete: "address-level2" })}
      </div>
      <Field id="lead-message" label="¿Qué te gustaría resolver? (opcional)" error={err.message}>
        <textarea
          id="lead-message"
          name="message"
          rows={3}
          defaultValue={v.message}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg shadow-card placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          placeholder="Ej.: tengo 3 sedes y los empleados marcan en una planilla."
        />
      </Field>
      {/* Campo trampa para robots: oculto para las personas. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-website">No llenar</label>
        <input id="lead-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-3 text-sm text-fg-muted">
        <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" aria-invalid={!!err.consent || undefined} />
        <span>
          Autorizo a Nexora a usar estos datos solo para contactarme sobre el servicio (Ley 1581 de 2012).
          {err.consent && <span className="mt-1 block text-xs text-danger" role="alert">{err.consent}</span>}
        </span>
      </label>
      <SubmitButton size="lg" className="w-full sm:w-auto sm:justify-self-start" pendingText="Enviando…">Solicitar mi invitación</SubmitButton>
    </form>
  );
}
