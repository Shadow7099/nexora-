"use client";

import { useActionState } from "react";
import { consentAction } from "../actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";

export function ConsentForm() {
  const [state, action] = useActionState(consentAction, null);
  return (
    <form action={action} className="grid gap-4">
      <FormAlert message={state?.message} />
      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm shadow-card">
        <input type="checkbox" name="accept" required className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span>He leído y autorizo el tratamiento de mis datos personales en los términos descritos.</span>
      </label>
      <SubmitButton size="lg" className="w-full">Aceptar y continuar</SubmitButton>
    </form>
  );
}
