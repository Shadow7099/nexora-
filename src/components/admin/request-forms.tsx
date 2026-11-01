"use client";

import { useActionState, useState } from "react";
import { addManualSessionAction, closeSessionAction, decideNoveltyAction, decideOvertimeAction, registerNoveltyAction, scanOvertimeAction } from "@/app/admin/gestion-actions";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Opt = { id: string; name: string };

/** Decisión sobre horas extra: aprobar todo, aprobar parcial o rechazar (con motivo). */
export function OvertimeDecision({ id, detected }: { id: string; detected: number }) {
  const [state, action] = useActionState(decideOvertimeAction.bind(null, id), null);
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  if (state?.ok) return <p className="text-sm text-success" role="status">{state.message}</p>;
  return (
    <form action={action} className="grid gap-2" noValidate>
      <input type="hidden" name="decision" value={mode} />
      <div className="flex flex-wrap items-end gap-2">
        {mode === "approve" ? (
          <label className="grid gap-1 text-xs text-fg-muted">Minutos a aprobar
            <Input name="approvedMinutes" inputMode="numeric" defaultValue={detected} className="w-28" aria-invalid={!!state?.fieldErrors?.approvedMinutes || undefined} />
          </label>
        ) : null}
        <label className="grid min-w-48 flex-1 gap-1 text-xs text-fg-muted">{mode === "approve" ? "Observación (opcional)" : "Motivo del rechazo"}
          <Input name="note" aria-invalid={!!state?.fieldErrors?.note || undefined} />
        </label>
        <SubmitButton size="sm" variant={mode === "approve" ? "primary" : "danger"}>{mode === "approve" ? "Aprobar" : "Rechazar"}</SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMode(mode === "approve" ? "reject" : "approve")}>
          {mode === "approve" ? "Rechazar…" : "Volver a aprobar"}
        </Button>
      </div>
      <FormAlert message={state?.fieldErrors?.approvedMinutes ?? state?.fieldErrors?.note ?? state?.message} />
    </form>
  );
}

export function NoveltyDecision({ id }: { id: string }) {
  const [state, action] = useActionState(decideNoveltyAction.bind(null, id), null);
  if (state?.ok) return <p className="text-sm text-success" role="status">{state.message}</p>;
  return (
    <form action={action} className="grid gap-2" noValidate>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-48 flex-1 gap-1 text-xs text-fg-muted">Observación (obligatoria si rechazas)<Input name="note" /></label>
        <SubmitButton size="sm" name="decision" value="approve">Aprobar</SubmitButton>
        <SubmitButton size="sm" variant="ghost" name="decision" value="reject">Rechazar</SubmitButton>
      </div>
      <FormAlert message={state?.fieldErrors?.note ?? state?.message} />
    </form>
  );
}

export function RegisterNovelty({ employees, types }: { employees: Opt[]; types: [string, string][] }) {
  const [state, action] = useActionState(registerNoveltyAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3" noValidate key={state?.ok ? "ok" : "form"}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-fg-muted">Empleado<Select name="employeeId">{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></label>
        <label className="grid gap-1 text-xs text-fg-muted">Tipo<Select name="type">{types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
        <label className="grid gap-1 text-xs text-fg-muted">Desde<Input type="date" name="startDate" aria-invalid={!!err.startDate || undefined} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Hasta<Input type="date" name="endDate" aria-invalid={!!err.endDate || undefined} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Horas (solo permisos de un día)<Input name="hours" inputMode="decimal" /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Nota<Input name="note" /></label>
      </div>
      <FormAlert message={err.endDate ?? err.hours ?? err.startDate ?? state?.message} tone={state?.ok ? "success" : "danger"} />
      <SubmitButton size="sm" className="justify-self-end">Registrar novedad aprobada</SubmitButton>
    </form>
  );
}

export function CloseSessionForm({ id }: { id: string }) {
  const [state, action] = useActionState(closeSessionAction.bind(null, id), null);
  if (state?.ok) return <p className="text-sm text-success" role="status">{state.message}</p>;
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-2" noValidate>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-fg-muted">Hora real de salida<Input type="time" name="endTime" className="w-32" aria-invalid={!!err.endTime || undefined} /></label>
        <label className="flex items-center gap-1.5 pb-2 text-xs text-fg-muted"><input type="checkbox" name="nextDay" className="size-4 accent-[var(--primary)]" /> Al día siguiente</label>
        <label className="grid min-w-56 flex-1 gap-1 text-xs text-fg-muted">Motivo (queda en la auditoría)<Input name="reason" aria-invalid={!!err.reason || undefined} /></label>
        <SubmitButton size="sm">Registrar salida</SubmitButton>
      </div>
      <FormAlert message={err.endTime ?? err.reason ?? state?.message} />
    </form>
  );
}

export function ManualSessionForm({ employees, sites }: { employees: Opt[]; sites: Opt[] }) {
  const [state, action] = useActionState(addManualSessionAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3" noValidate key={state?.ok ? "ok" : "form"}>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-fg-muted">Empleado<Select name="employeeId">{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></label>
        <label className="grid gap-1 text-xs text-fg-muted">Sede<Select name="siteId">{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></label>
        <label className="grid gap-1 text-xs text-fg-muted">Fecha<Input type="date" name="date" aria-invalid={!!err.date || undefined} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Entrada<Input type="time" name="startTime" /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Salida<Input type="time" name="endTime" aria-invalid={!!err.endTime || undefined} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Motivo<Input name="reason" aria-invalid={!!err.reason || undefined} /></label>
      </div>
      <FormAlert message={err.endTime ?? err.reason ?? err.date ?? state?.message} tone={state?.ok ? "success" : "danger"} />
      <SubmitButton size="sm" variant="secondary" className="justify-self-end">Agregar jornada</SubmitButton>
    </form>
  );
}

export function ScanOvertimeButton() {
  const [state, action] = useActionState(scanOvertimeAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <SubmitButton size="sm" variant="secondary" pendingText="Revisando…">Revisar jornadas pasadas</SubmitButton>
      {state?.message && <span className="text-xs text-fg-muted" role="status">{state.message}</span>}
    </form>
  );
}
