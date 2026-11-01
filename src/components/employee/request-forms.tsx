"use client";

import { useActionState } from "react";
import { cancelNoveltyAction, overtimeNoteAction, requestNoveltyAction } from "@/app/app/solicitudes/actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function NoveltyRequestForm({ types }: { types: [string, string][] }) {
  const [state, action] = useActionState(requestNoveltyAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3" noValidate key={state?.ok ? "sent" : "form"}>
      <label className="grid gap-1 text-sm">Tipo<Select name="type">{types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm">Desde<Input type="date" name="startDate" aria-invalid={!!err.startDate || undefined} /></label>
        <label className="grid gap-1 text-sm">Hasta<Input type="date" name="endDate" aria-invalid={!!err.endDate || undefined} /></label>
      </div>
      <label className="grid gap-1 text-sm">Horas (solo si es un permiso de unas horas)<Input name="hours" inputMode="decimal" placeholder="Ej.: 2" /></label>
      <label className="grid gap-1 text-sm">Comentario<Input name="note" placeholder="Cita médica, viaje familiar…" /></label>
      <FormAlert message={err.endDate ?? err.hours ?? err.startDate ?? state?.message} tone={state?.ok ? "success" : "danger"} />
      <SubmitButton size="lg" className="w-full">Enviar solicitud</SubmitButton>
    </form>
  );
}

export function CancelNovelty({ id }: { id: string }) {
  const [, action] = useActionState(cancelNoveltyAction.bind(null, id), null);
  return (
    <form action={action}>
      <SubmitButton size="sm" variant="ghost">Retirar</SubmitButton>
    </form>
  );
}

export function OvertimeNote({ id }: { id: string }) {
  const [state, action] = useActionState(overtimeNoteAction.bind(null, id), null);
  if (state?.ok) return <p className="text-xs text-success">{state.message}</p>;
  return (
    <form action={action} className="mt-2 flex gap-2">
      <Input name="note" placeholder="¿Por qué te quedaste más tiempo?" className="h-8 text-sm" />
      <SubmitButton size="sm" variant="secondary">Enviar</SubmitButton>
      {state?.message && <span className="text-xs text-danger">{state.message}</span>}
    </form>
  );
}
