"use client";

import { startTransition, useActionState, useState } from "react";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/server/errors";

type Values = Record<string, string | undefined>;
const UNITS: [string, string][] = [
  ["UNIDAD", "Unidad"], ["KG", "Kilogramo"], ["GRAMO", "Gramo"], ["LITRO", "Litro"], ["ML", "Mililitro"], ["METRO", "Metro"], ["CAJA", "Caja"], ["PAQUETE", "Paquete"], ["HORA", "Hora"], ["SERVICIO", "Servicio"],
];

/** Formulario del producto o servicio (crear y editar). */
export function ProductForm({ action, values, submitLabel, categories }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values: Values; submitLabel: string; categories: string[] }) {
  const [state, formAction, isPending] = useActionState(action, null);
  const v = state?.ok === false && state.data ? { ...values, ...state.data } : values;
  const err = state?.fieldErrors ?? {};
  const [kind, setKind] = useState(v.kind ?? "PRODUCT");
  const F = (name: string, label: string, props: React.ComponentProps<"input"> = {}, hint?: string) => (
    <Field id={name} label={label} error={err[name]} hint={hint}>
      <Input id={name} name={name} defaultValue={v[name]} aria-invalid={!!err[name] || undefined} {...props} />
    </Field>
  );
  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(e) => {
        // Sin el reinicio automático de React: con un error se conserva lo escrito.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="kind" label="Tipo" error={err.kind}>
          <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="PRODUCT">Producto (lleva inventario)</option>
            <option value="SERVICE">Servicio (sin inventario)</option>
          </Select>
        </Field>
        {F("sku", "Código (SKU)", { autoCapitalize: "characters", spellCheck: false }, "Único en tu empresa. Ej.: PAN-01")}
        <div className="sm:col-span-2">{F("name", "Nombre")}</div>
        {F("category", "Categoría (opcional)", { list: "categorias" })}
        <datalist id="categorias">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        <Field id="unit" label="Unidad" error={err.unit}>
          <Select id="unit" name="unit" defaultValue={v.unit ?? (kind === "SERVICE" ? "SERVICIO" : "UNIDAD")}>
            {UNITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        {F("price", "Precio de venta (COP)", { inputMode: "decimal" }, "Antes de IVA")}
        <Field id="taxRate" label="IVA" error={err.taxRate}>
          <Select id="taxRate" name="taxRate" defaultValue={v.taxRate ?? "0"}>
            <option value="0">0 % (excluido o exento)</option>
            <option value="5">5 %</option>
            <option value="19">19 %</option>
          </Select>
        </Field>
        {F("cost", "Costo unitario (opcional)", { inputMode: "decimal" }, kind === "PRODUCT" ? "Se actualiza con cada entrada que registre costo" : undefined)}
        {kind === "PRODUCT" && F("minStock", "Stock mínimo (opcional)", { inputMode: "decimal" }, "Avisa cuando el stock total llegue a este número")}
        {F("barcode", "Código de barras (opcional)", { inputMode: "numeric" })}
      </div>
      <SubmitButton loading={isPending} className="justify-self-start" pendingText="Guardando…">{submitLabel}</SubmitButton>
    </form>
  );
}

/** Activar o desactivar el producto (desactivado no aparece en la lista ni se mueve). */
export function ProductActiveToggle({ active, action }: { active: boolean; action: () => Promise<ActionState> }) {
  const [state, run] = useActionState(action, null);
  return (
    <form action={run} className="grid justify-items-end gap-1">
      <SubmitButton variant={active ? "ghost" : "secondary"} size="sm" pendingText="Guardando…">{active ? "Desactivar" : "Activar"}</SubmitButton>
      {state?.message && <span role="status" className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>{state.message}</span>}
    </form>
  );
}
