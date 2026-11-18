"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/server/errors";

/** Registrar entrada, salida, ajuste por conteo o traslado de un producto. */
export function MovementForm({ action, sites }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; sites: { id: string; name: string; qty: number }[] }) {
  const [state, formAction, isPending] = useActionState(action, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.ok === false && state.data ? state.data : {};
  const [type, setType] = useState(v.type ?? "IN");
  const formRef = useRef<HTMLFormElement>(null);
  // Se limpia solo cuando el movimiento quedó registrado (con error se conserva lo escrito).
  useEffect(() => {
    if (!state?.ok || !formRef.current) return;
    for (const name of ["quantity", "unitCost", "reason", "reference"]) {
      const el = formRef.current.elements.namedItem(name);
      if (el instanceof HTMLInputElement) el.value = "";
    }
  }, [state]);
  return (
    <form
      ref={formRef}
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="type" label="Movimiento" error={err.type}>
          <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="IN">Entrada (compra, producción)</option>
            <option value="OUT">Salida (consumo, daño, pérdida)</option>
            <option value="ADJUST">Ajuste por conteo físico</option>
            <option value="TRANSFER">Traslado entre sedes</option>
          </Select>
        </Field>
        <Field id="siteId" label={type === "TRANSFER" ? "Sede de origen" : "Sede"} error={err.siteId}>
          <Select id="siteId" name="siteId" defaultValue={v.siteId ?? sites[0]?.id}>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name} (hay {s.qty})</option>)}
          </Select>
        </Field>
        {type === "TRANSFER" && (
          <Field id="toSiteId" label="Sede de destino" error={err.toSiteId}>
            <Select id="toSiteId" name="toSiteId" defaultValue={v.toSiteId ?? sites[1]?.id ?? ""}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}
        <Field id="quantity" label={type === "ADJUST" ? "Cantidad contada" : "Cantidad"} error={err.quantity} hint={type === "ADJUST" ? "Lo que hay físicamente; Nexora registra la diferencia" : undefined}>
          <Input id="quantity" name="quantity" inputMode="decimal" defaultValue={v.quantity} aria-invalid={!!err.quantity || undefined} />
        </Field>
        {type === "IN" && (
          <Field id="unitCost" label="Costo unitario (opcional)" error={err.unitCost}>
            <Input id="unitCost" name="unitCost" inputMode="decimal" defaultValue={v.unitCost} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field id="reason" label="Motivo" error={err.reason}>
            <Input id="reason" name="reason" defaultValue={v.reason} placeholder="Ej.: compra a proveedor, producto vencido, conteo de fin de mes" aria-invalid={!!err.reason || undefined} />
          </Field>
        </div>
        <Field id="reference" label="Referencia (opcional)" error={err.reference}>
          <Input id="reference" name="reference" defaultValue={v.reference} placeholder="N.º de factura o remisión" />
        </Field>
      </div>
      <SubmitButton loading={isPending} className="justify-self-start" pendingText="Registrando…">Registrar movimiento</SubmitButton>
    </form>
  );
}
