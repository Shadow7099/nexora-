"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormAlert message={state?.message} />
      <Field id="email" label="Correo" error={err.email}>
        <Input id="email" name="email" type="email" autoComplete="username" inputMode="email" required autoFocus
          defaultValue={state?.data?.email} aria-invalid={!!err.email || undefined} aria-describedby={err.email ? "email-error" : undefined} />
      </Field>
      <Field id="password" label="Contraseña" error={err.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required
          aria-invalid={!!err.password || undefined} aria-describedby={err.password ? "password-error" : undefined} />
      </Field>
      <SubmitButton size="lg" className="mt-2 w-full" pendingText="Ingresando…">Ingresar</SubmitButton>
    </form>
  );
}
