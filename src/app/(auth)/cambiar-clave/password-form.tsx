"use client";

import { useActionState } from "react";
import { changePasswordAction } from "../actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { PASSWORD_MIN } from "@/lib/validation";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  const err = state?.fieldErrors ?? {};
  const input = (name: string, label: string, autoComplete: string, hint?: string) => (
    <Field id={name} label={label} error={err[name]} hint={hint}>
      <Input id={name} name={name} type="password" autoComplete={autoComplete} required
        aria-invalid={!!err[name] || undefined} aria-describedby={err[name] ? `${name}-error` : hint ? `${name}-hint` : undefined} />
    </Field>
  );
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} />
      {input("current", "Contraseña actual", "current-password")}
      {input("next", "Nueva contraseña", "new-password", `Mínimo ${PASSWORD_MIN} caracteres, con letras y números.`)}
      {input("confirm", "Repite la nueva contraseña", "new-password")}
      <SubmitButton size="lg" className="mt-2 w-full" pendingText="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}
