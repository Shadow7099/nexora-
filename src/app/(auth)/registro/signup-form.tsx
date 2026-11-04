"use client";

import { useActionState } from "react";
import { signupAction } from "../actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { CONSENT_ITEMS } from "@/lib/consent-text";
import { PASSWORD_MIN } from "@/lib/validation";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.data ?? {};
  const F = (name: string, label: string, props: React.ComponentProps<"input"> = {}, hint?: string) => (
    <Field id={name} label={label} error={err[name]} hint={hint}>
      <Input id={name} name={name} defaultValue={v[name]} aria-invalid={!!err[name] || undefined}
        aria-describedby={err[name] ? `${name}-error` : hint ? `${name}-hint` : undefined} {...props} />
    </Field>
  );
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} />
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium text-fg-muted">Tu empresa</legend>
        {F("companyName", "Nombre comercial", { required: true, autoComplete: "organization", autoFocus: true })}
        {F("nit", "NIT (opcional)", { inputMode: "numeric" }, "Lo puedes agregar después.")}
      </fieldset>
      <fieldset className="mt-2 grid gap-4">
        <legend className="mb-1 text-sm font-medium text-fg-muted">Tu cuenta de administrador</legend>
        {F("adminName", "Tu nombre completo", { required: true, autoComplete: "name" })}
        {F("adminEmail", "Correo", { type: "email", inputMode: "email", required: true, autoComplete: "username" })}
        <Field id="password" label="Contraseña" error={err.password} hint={`Mínimo ${PASSWORD_MIN} caracteres, con letras y números.`}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!err.password || undefined}
            aria-describedby={err.password ? "password-error" : "password-hint"} />
        </Field>
        <Field id="confirm" label="Repite la contraseña" error={err.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!err.confirm || undefined}
            aria-describedby={err.confirm ? "confirm-error" : undefined} />
        </Field>
      </fieldset>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm shadow-card">
        <input type="checkbox" name="accept" required className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span>
          Autorizo el tratamiento de mis datos personales (Ley 1581 de 2012) en los términos descritos abajo, y declaro que tengo facultad para registrar a esta empresa.
        </span>
      </label>
      {err.accept && <p className="-mt-2 text-xs text-danger" role="alert">{err.accept}</p>}
      <details className="-mt-1 text-sm text-fg-muted">
        <summary className="cursor-pointer select-none text-primary">Ver la autorización de datos</summary>
        <dl className="mt-2 grid gap-2 rounded-lg border border-border bg-surface p-3 text-xs">
          {CONSENT_ITEMS.map(([k, t]) => (
            <div key={k}>
              <dt className="font-medium text-fg">{k}</dt>
              <dd className="mt-0.5">{t}</dd>
            </div>
          ))}
        </dl>
      </details>
      <SubmitButton size="lg" className="mt-2 w-full" pendingText="Creando tu empresa…">Crear empresa</SubmitButton>
    </form>
  );
}
