"use client";

import { useActionState } from "react";
import { activateAction } from "../actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";

export function ActivateForm() {
  const [state, action] = useActionState(activateAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} />
      <Field id="documentNumber" label="Cédula" error={err.documentNumber}>
        <Input id="documentNumber" name="documentNumber" inputMode="numeric" autoComplete="off" required autoFocus
          defaultValue={state?.data?.documentNumber} aria-invalid={!!err.documentNumber || undefined} />
      </Field>
      <Field id="code" label="Código de activación" error={err.code}>
        <Input id="code" name="code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="ABCD-1234" required
          defaultValue={state?.data?.code} className="font-mono tracking-widest uppercase" aria-invalid={!!err.code || undefined} />
      </Field>
      <SubmitButton size="lg" className="mt-2 w-full" pendingText="Activando…">Activar</SubmitButton>
    </form>
  );
}
