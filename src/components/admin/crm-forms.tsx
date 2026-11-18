"use client";

import { Check } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { addActivityAction, completeTaskAction, createDealAction, moveDealAction } from "@/app/admin/crm/actions";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/server/errors";

const STAGES: [string, string][] = [["NEW", "Nuevo"], ["CONTACTED", "Contactado"], ["PROPOSAL", "Propuesta"], ["NEGOTIATION", "Negociación"], ["WON", "Ganado"], ["LOST", "Perdido"]];

/** Envía sin el reinicio automático de React: con un error se conserva lo escrito. */
const manualSubmit = (dispatch: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => dispatch(fd));
};

/** Formulario del cliente (crear y editar). */
export function CustomerForm({ action, values, submitLabel }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values: Record<string, string | undefined>; submitLabel: string }) {
  const [state, dispatch, pending] = useActionState(action, null);
  const v = state?.ok === false && state.data ? { ...values, ...state.data } : values;
  const err = state?.fieldErrors ?? {};
  const F = (name: string, label: string, props: React.ComponentProps<"input"> = {}) => (
    <Field id={`cu-${name}`} label={label} error={err[name]}>
      <Input id={`cu-${name}`} name={name} defaultValue={v[name]} aria-invalid={!!err[name] || undefined} {...props} />
    </Field>
  );
  return (
    <form onSubmit={manualSubmit(dispatch)} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{F("name", "Nombre o razón social")}</div>
        <Field id="cu-documentType" label="Tipo de documento (opcional)" error={err.documentType}>
          <Select id="cu-documentType" name="documentType" defaultValue={v.documentType ?? ""}>
            <option value="">—</option>
            {["CC", "NIT", "CE", "PASAPORTE", "PPT", "OTRO"].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        {F("documentNumber", "Número de documento (opcional)", { inputMode: "numeric" })}
        {F("phone", "Celular / WhatsApp", { type: "tel", inputMode: "tel" })}
        {F("email", "Correo", { type: "email" })}
        {F("city", "Ciudad (opcional)")}
        {F("address", "Dirección (opcional)")}
        <div className="sm:col-span-2">{F("notes", "Notas (opcional)")}</div>
      </div>
      <label className="flex items-start gap-3 text-sm text-fg-muted">
        <input type="checkbox" name="marketingConsent" defaultChecked={v.marketingConsent === "on" || v.marketingConsent === "true"} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
        <span>El cliente autorizó recibir mensajes comerciales (Ley 1581 de 2012). Sin esta autorización no le envíes promociones.</span>
      </label>
      <SubmitButton loading={pending} className="justify-self-start">{submitLabel}</SubmitButton>
    </form>
  );
}

/** Cambiar la etapa de una oportunidad (perdida pide el motivo). */
export function DealStageSelect({ id, stage, label }: { id: string; stage: string; label: string }) {
  const [state, dispatch, pending] = useActionState(moveDealAction.bind(null, id), null);
  const [to, setTo] = useState(stage);
  return (
    <form onSubmit={manualSubmit(dispatch)} className="grid gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={`stage-${id}`} className="sr-only">Etapa de {label}</label>
        <Select id={`stage-${id}`} name="stage" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs">
          {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        {to !== stage && <SubmitButton size="sm" loading={pending}>Mover</SubmitButton>}
      </div>
      {to === "LOST" && to !== stage && <Input name="lostReason" placeholder="¿Por qué se perdió?" aria-label={`Motivo de pérdida de ${label}`} className="h-8 text-xs" />}
      {state?.message && !state.ok && <p role="alert" className="text-xs text-danger">{state.message}</p>}
    </form>
  );
}

/** Nueva oportunidad para un cliente. */
export function DealForm({ customerId, users }: { customerId: string; users: { id: string; name: string }[] }) {
  const [state, dispatch, pending] = useActionState(createDealAction, null);
  const err = state?.fieldErrors ?? {};
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} onSubmit={manualSubmit(dispatch)} className="grid gap-3" noValidate>
      <input type="hidden" name="customerId" value={customerId} />
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <Field id="deal-title" label="¿Qué quiere el cliente?" error={err.title}>
        <Input id="deal-title" name="title" placeholder="Ej.: torta para 50 personas" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="deal-value" label="Valor estimado (opcional)" error={err.value}><Input id="deal-value" name="value" inputMode="decimal" /></Field>
        <Field id="deal-close" label="Cierre esperado (opcional)" error={err.expectedClose}><Input id="deal-close" name="expectedClose" type="date" /></Field>
        <Field id="deal-owner" label="Responsable" error={err.ownerId}>
          <Select id="deal-owner" name="ownerId" defaultValue="">
            <option value="">Yo</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
      </div>
      <SubmitButton loading={pending} variant="secondary" className="justify-self-start">Crear oportunidad</SubmitButton>
    </form>
  );
}

/** Registrar un seguimiento o programar una tarea. */
export function ActivityForm({ customerId, deals }: { customerId: string; deals: { id: string; title: string }[] }) {
  const [state, dispatch, pending] = useActionState(addActivityAction, null);
  const err = state?.fieldErrors ?? {};
  const [type, setType] = useState("NOTE");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state?.ok || !ref.current) return;
    for (const n of ["body", "dueAt"]) {
      const el = ref.current.elements.namedItem(n);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = "";
    }
  }, [state]);
  return (
    <form ref={ref} onSubmit={manualSubmit(dispatch)} className="grid gap-3" noValidate>
      <input type="hidden" name="customerId" value={customerId} />
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="act-type" label="Tipo" error={err.type}>
          <Select id="act-type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="NOTE">Nota</option>
            <option value="CALL">Llamada</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Correo</option>
            <option value="MEETING">Reunión</option>
            <option value="TASK">Tarea (con fecha)</option>
          </Select>
        </Field>
        {deals.length > 0 && (
          <Field id="act-deal" label="Oportunidad (opcional)" error={err.dealId}>
            <Select id="act-deal" name="dealId" defaultValue="">
              <option value="">Ninguna</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </Select>
          </Field>
        )}
      </div>
      <Field id="act-body" label={type === "TASK" ? "¿Qué hay que hacer?" : "Detalle"} error={err.body}>
        <textarea id="act-body" name="body" rows={2} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg shadow-card focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none" />
      </Field>
      {type === "TASK" && (
        <Field id="act-due" label="Fecha y hora" error={err.dueAt}><Input id="act-due" name="dueAt" type="datetime-local" /></Field>
      )}
      <SubmitButton loading={pending} variant="secondary" className="justify-self-start">{type === "TASK" ? "Programar tarea" : "Registrar"}</SubmitButton>
    </form>
  );
}

/** Marcar una tarea como hecha. */
export function CompleteTaskButton({ id }: { id: string }) {
  const [state, dispatch, pending] = useActionState(completeTaskAction.bind(null, id), null);
  if (state?.ok) return <span className="text-xs text-success">Hecha</span>;
  return (
    <Button size="sm" variant="secondary" loading={pending} onClick={() => startTransition(() => dispatch())}>
      <Check aria-hidden /> Hecha
    </Button>
  );
}
