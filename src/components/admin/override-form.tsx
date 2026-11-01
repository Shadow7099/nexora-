"use client";

import { useActionState, useState } from "react";
import { clearOverrideAction, setOverrideAction } from "@/app/admin/gestion-actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Opt = { id: string; name: string };

export function OverrideForm({ employeeId, templates, sites, defaultSiteId }: { employeeId: string; templates: Opt[]; sites: Opt[]; defaultSiteId: string }) {
  const [state, action] = useActionState(setOverrideAction.bind(null, employeeId), null);
  const [kind, setKind] = useState("shift");
  return (
    <form action={action} className="grid gap-3" noValidate>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="grid gap-1 text-xs text-fg-muted">Fecha<Input type="date" name="date" required /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Ese día
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="shift">Trabaja otro turno</option>
            <option value="rest">Descansa</option>
          </Select>
        </label>
        {kind === "shift" && (
          <>
            <label className="grid gap-1 text-xs text-fg-muted">Turno<Select name="templateId">{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></label>
            <label className="grid gap-1 text-xs text-fg-muted">Sede<Select name="siteId" defaultValue={defaultSiteId}>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></label>
          </>
        )}
      </div>
      <label className="grid gap-1 text-xs text-fg-muted">Nota (opcional)<Input name="note" placeholder="Cambio de turno con Laura" /></label>
      <FormAlert message={state?.message ?? state?.fieldErrors?.date} tone={state?.ok ? "success" : "danger"} />
      <SubmitButton size="sm" className="justify-self-end">Guardar cambio</SubmitButton>
    </form>
  );
}

export function ClearOverride({ employeeId, date }: { employeeId: string; date: string }) {
  const [, action] = useActionState(clearOverrideAction.bind(null, employeeId, date), null);
  return (
    <form action={action}>
      <SubmitButton size="sm" variant="ghost">Quitar</SubmitButton>
    </form>
  );
}
