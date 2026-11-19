"use client";

import { useActionState } from "react";
import { codeLoginAction } from "../actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";

/** Empleados: entrar con el código de acceso que les dio la empresa. */
export function ActivateForm({ next }: { next?: string }) {
  const [state, action] = useActionState(codeLoginAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormAlert message={state?.message} />
      <Field id="code" label="Código de empleado" error={err.code}>
        <Input id="code" name="code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="ABCDE-12345" required
          defaultValue={state?.data?.code} className="font-mono tracking-widest uppercase" aria-invalid={!!err.code || undefined} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Entrando…">Entrar</SubmitButton>
    </form>
  );
}
