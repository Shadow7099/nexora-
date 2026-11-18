"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { cashMovementAction, closeCashAction, reopenCashAction, voidCashAction } from "@/app/admin/caja/actions";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn, formatCOP } from "@/lib/utils";

const CATEGORIES = {
  IN: ["Ventas", "Abono de cliente", "Base de caja", "Otros ingresos"],
  OUT: ["Compras", "Proveedores", "Servicios públicos", "Transporte", "Nómina", "Arriendo", "Retiro a banco", "Gastos varios"],
};

/** Envía sin el reinicio automático de React: con un error se conserva lo escrito. */
function manualSubmit(dispatch: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}

/** Registrar un ingreso o egreso del día. */
export function CashMovementForm({ siteId, date }: { siteId: string; date: string }) {
  const [state, action, pending] = useActionState(cashMovementAction, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.ok === false && state.data ? state.data : {};
  const [type, setType] = useState<"IN" | "OUT">((v.type as "IN" | "OUT") ?? "IN");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state?.ok || !formRef.current) return;
    for (const name of ["amount", "description"]) {
      const el = formRef.current.elements.namedItem(name);
      if (el instanceof HTMLInputElement) el.value = "";
    }
  }, [state]);
  return (
    <form ref={formRef} onSubmit={manualSubmit(action)} className="grid gap-4" noValidate>
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="date" value={date} />
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
        {(["IN", "OUT"] as const).map((t) => (
          <label key={t} className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium", type === t ? (t === "IN" ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger") : "border-border text-fg-muted")}>
            <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
            {t === "IN" ? "Ingreso" : "Egreso"}
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cash-amount" label="Valor (COP)" error={err.amount}>
          <Input id="cash-amount" name="amount" inputMode="decimal" defaultValue={v.amount} aria-invalid={!!err.amount || undefined} />
        </Field>
        <Field id="cash-method" label="Medio de pago" error={err.method}>
          <Select id="cash-method" name="method" defaultValue={v.method ?? "CASH"}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CARD">Tarjeta</option>
            <option value="OTHER">Otro</option>
          </Select>
        </Field>
        <Field id="cash-category" label="Categoría" error={err.category}>
          <Input id="cash-category" name="category" list={`cat-${type}`} defaultValue={v.category ?? (type === "IN" ? "Ventas" : "")} key={type} aria-invalid={!!err.category || undefined} />
        </Field>
        <datalist id={`cat-${type}`}>{CATEGORIES[type].map((c) => <option key={c} value={c} />)}</datalist>
        <Field id="cash-description" label="Detalle (opcional)" error={err.description}>
          <Input id="cash-description" name="description" defaultValue={v.description} placeholder={type === "IN" ? "Ej.: ventas de la mañana" : "Ej.: compra de harina"} />
        </Field>
      </div>
      <SubmitButton loading={pending} className="justify-self-start">Registrar {type === "IN" ? "ingreso" : "egreso"}</SubmitButton>
    </form>
  );
}

/** Anular un movimiento (pide el motivo en línea). */
export function VoidCashButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(voidCashAction.bind(null, id), null);
  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Anular</Button>;
  return (
    <form onSubmit={manualSubmit(action)} className="grid gap-2" noValidate>
      <label htmlFor={`void-${id}`} className="sr-only">Motivo de la anulación</label>
      <Input id={`void-${id}`} name="reason" placeholder="Motivo de la anulación" autoFocus />
      <div className="flex gap-2">
        <SubmitButton size="sm" variant="secondary" loading={pending}>Confirmar anulación</SubmitButton>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
      {state?.message && !state.ok && <p role="alert" className="text-xs text-danger">{state.message}</p>}
    </form>
  );
}

/** Cerrar el día: el efectivo contado contra el esperado, con la diferencia en vivo. */
export function CloseCashForm({ siteId, date, expected }: { siteId: string; date: string; expected: number }) {
  const [state, action, pending] = useActionState(closeCashAction, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.ok === false && state.data ? state.data : {};
  const [counted, setCounted] = useState(v.counted ?? "");
  const n = Number(counted.replace(/[^\d.,-]/g, "").replace(",", "."));
  const diff = counted.trim() !== "" && Number.isFinite(n) ? Math.round((n - expected) * 100) / 100 : null;
  return (
    <form onSubmit={manualSubmit(action)} className="grid gap-4" noValidate>
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="date" value={date} />
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <Field id="cash-counted" label="Efectivo contado en caja" error={err.counted} hint={`Esperado: ${formatCOP(expected)}`}>
        <Input id="cash-counted" name="counted" inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} aria-invalid={!!err.counted || undefined} />
      </Field>
      {diff != null && (
        <p role="status" className={cn("rounded-lg px-3 py-2 text-sm font-medium", diff === 0 ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
          {diff === 0 ? "La caja cuadra." : `${diff > 0 ? "Sobran" : "Faltan"} ${formatCOP(Math.abs(diff))}.`}
        </p>
      )}
      <Field id="cash-notes" label={diff != null && diff !== 0 ? "Explica la diferencia" : "Observaciones (opcional)"} error={err.notes}>
        <Input id="cash-notes" name="notes" defaultValue={v.notes} aria-invalid={!!err.notes || undefined} />
      </Field>
      <SubmitButton loading={pending} className="justify-self-start">Cerrar el día</SubmitButton>
      <p className="text-xs text-fg-muted">Después de cerrar no se pueden registrar ni anular movimientos de este día, salvo que lo reabras con un motivo.</p>
    </form>
  );
}

/** Reabrir un día cerrado (con motivo). */
export function ReopenCashForm({ closingId }: { closingId: string }) {
  const [state, action, pending] = useActionState(reopenCashAction.bind(null, closingId), null);
  return (
    <form onSubmit={manualSubmit(action)} className="grid gap-2" noValidate>
      <Field id="reopen-reason" label="Motivo para reabrir" error={state?.ok ? undefined : state?.fieldErrors?.reason}>
        <Input id="reopen-reason" name="reason" placeholder="Ej.: faltó registrar un gasto" />
      </Field>
      <SubmitButton size="sm" variant="secondary" loading={pending} className="justify-self-start">Reabrir el día</SubmitButton>
      {state?.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>{state.message}</p>}
    </form>
  );
}
