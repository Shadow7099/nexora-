"use client";

import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { createInvitationAction, revokeInvitationAction } from "@/app/plataforma/empresas-actions";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";

/** Crea un link de invitación y lo muestra una sola vez para copiarlo y enviarlo. */
export function InvitationForm() {
  const [state, action] = useActionState(createInvitationAction, null);
  const [copied, setCopied] = useState(false);
  const err = state?.fieldErrors ?? {};
  const v = state?.ok ? {} : (state?.data ?? {});
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {state?.ok && state.data?.url && (
        <div role="status" className="min-w-0 rounded-xl border border-success/30 bg-success-soft p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-success"><LinkIcon className="size-4" aria-hidden /> Link de invitación</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg" data-testid="invitation-url">{state.data.url}</code>
            <Button type="button" variant="secondary" size="icon" aria-label="Copiar link" onClick={async () => { await navigator.clipboard?.writeText(state.data!.url!); setCopied(true); }}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            Envíaselo al dueño del negocio. Sirve una sola vez y vence el {new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date(state.data.expiresAt!))}. No se volverá a mostrar.
          </p>
        </div>
      )}
      <form action={action} className="grid gap-4" noValidate key={state?.ok ? state.data?.url : "form"}>
        <FormAlert message={state?.ok ? undefined : state?.message} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="label" label="Para quién es" error={err.label} hint="Nombre del negocio o del dueño, para reconocerla en la lista.">
            <Input id="label" name="label" defaultValue={v.label} aria-invalid={!!err.label || undefined} />
          </Field>
          <Field id="validDays" label="Días de validez" error={err.validDays}>
            <Input id="validDays" name="validDays" inputMode="numeric" defaultValue={v.validDays ?? "14"} aria-invalid={!!err.validDays || undefined} />
          </Field>
          <Field id="planCode" label="Plan (opcional)" error={err.planCode}>
            <Input id="planCode" name="planCode" defaultValue={v.planCode} placeholder="piloto" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="maxSites" label="Límite de sedes" error={err.maxSites}>
              <Input id="maxSites" name="maxSites" inputMode="numeric" defaultValue={v.maxSites} aria-invalid={!!err.maxSites || undefined} />
            </Field>
            <Field id="maxEmployees" label="Límite de empleados" error={err.maxEmployees}>
              <Input id="maxEmployees" name="maxEmployees" inputMode="numeric" defaultValue={v.maxEmployees} aria-invalid={!!err.maxEmployees || undefined} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton pendingText="Generando…">Generar link</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function RevokeInvitationButton({ id, label }: { id: string; label: string }) {
  const [state, action] = useActionState(revokeInvitationAction.bind(null, id), null);
  return (
    <form action={action} className="grid justify-items-end gap-1">
      <SubmitButton variant="ghost" size="sm" pendingText="Anulando…" aria-label={`Anular invitación de ${label}`}>Anular</SubmitButton>
      {state?.message && !state.ok && <span className="text-xs text-danger" role="alert">{state.message}</span>}
    </form>
  );
}
