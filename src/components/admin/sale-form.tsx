"use client";

import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { startTransition, useActionState, useMemo, useState } from "react";
import { createSaleAction, voidSaleAction } from "@/app/admin/ventas/actions";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { computeLine } from "@/lib/sale-math";
import { cn, formatCOP } from "@/lib/utils";

type Product = { id: string; sku: string; name: string; kind: "PRODUCT" | "SERVICE"; unit: string; price: number; taxRate: number; stock: Record<string, number> | null };
type Customer = { id: string; name: string; documentType: string | null; documentNumber: string | null };
type Line = { productId: string; quantity: string; discount: string };

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Nueva venta: productos con buscador, cantidades, descuentos, cliente y medio de pago; totales en vivo. */
export function SaleForm({ sites, products, customers }: { sites: { id: string; name: string }[]; products: Product[]; customers: Customer[] }) {
  const [state, action, pending] = useActionState(createSaleAction, null);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("CASH");
  const [mode, setMode] = useState<"final" | "existing" | "new">("final");
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState({ name: "", documentType: "CC", documentNumber: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const err = state?.fieldErrors ?? {};

  const matches = query.trim()
    ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];
  const add = (p: Product) => {
    setLines((ls) => (ls.some((l) => l.productId === p.id) ? ls.map((l) => (l.productId === p.id ? { ...l, quantity: String(num(l.quantity) + 1) } : l)) : [...ls, { productId: p.id, quantity: "1", discount: "" }]));
    setQuery("");
  };
  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const computed = lines.map((l) => {
    const p = byId.get(l.productId)!;
    const c = computeLine(num(l.quantity), p.price, num(l.discount), p.taxRate);
    const available = p.stock ? (p.stock[siteId] ?? 0) : null;
    return { l, p, c, short: available != null && num(l.quantity) > available, available };
  });
  const totals = computed.reduce((a, x) => ({ subtotal: a.subtotal + x.c.subtotal, tax: a.tax + x.c.tax, discount: a.discount + num(x.l.discount) }), { subtotal: 0, tax: 0, discount: 0 });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        siteId, paymentMethod: method, customerMode: mode, customerId, notes,
        customer: mode === "new" ? customer : undefined,
        items: lines.map((l) => ({ productId: l.productId, quantity: num(l.quantity), discount: num(l.discount) })),
      }),
    );
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" noValidate>
      <div className="grid content-start gap-4">
        <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
        <Field id="sale-site" label="Sede" error={err.siteId}>
          <Select id="sale-site" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <div className="relative">
          <label htmlFor="sale-search" className="text-sm font-medium">Agregar producto</label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input
              id="sale-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) {
                  e.preventDefault();
                  add(matches[0]);
                }
              }}
              placeholder="Busca por nombre o código"
              className="pl-9"
              autoComplete="off"
              role="combobox"
              aria-expanded={matches.length > 0}
              aria-controls="sale-results"
            />
          </div>
          {matches.length > 0 && (
            <ul id="sale-results" role="listbox" aria-label="Productos" className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-md">
              {matches.map((p) => (
                <li key={p.id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => add(p)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-bg-subtle">
                    <span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="text-xs text-fg-subtle">{p.sku}{p.stock ? ` · hay ${p.stock[siteId] ?? 0}` : " · servicio"}</span></span>
                    <span className="tabular shrink-0">{formatCOP(p.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-fg-muted">Busca un producto y tócalo para agregarlo a la venta.</p>
        ) : (
          <ul className="grid gap-3" aria-label="Productos de la venta">
            {computed.map(({ l, p, c, short, available }, i) => (
              <li key={l.productId} className={cn("grid gap-3 rounded-xl border p-3", short ? "border-danger/50 bg-danger-soft/40" : "border-border")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-fg-subtle">{p.sku} · {formatCOP(p.price)} + IVA {p.taxRate} %{available != null ? ` · hay ${available}` : ""}</p>
                    {short && <p className="text-xs text-danger" role="alert">No hay suficiente en esta sede.</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${p.name}`} onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}><Trash2 /></Button>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <div>
                    <span className="text-xs text-fg-muted" id={`qty-l-${i}`}>Cantidad</span>
                    <div className="mt-1 flex items-center gap-1">
                      <Button type="button" variant="secondary" size="icon" aria-label="Menos" onClick={() => update(i, { quantity: String(Math.max(1, num(l.quantity) - 1)) })}><Minus /></Button>
                      <Input aria-labelledby={`qty-l-${i}`} value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} inputMode="decimal" className="w-16 text-center" />
                      <Button type="button" variant="secondary" size="icon" aria-label="Más" onClick={() => update(i, { quantity: String(num(l.quantity) + 1) })}><Plus /></Button>
                    </div>
                  </div>
                  <label className="grid gap-1 text-xs text-fg-muted">
                    Descuento (COP)
                    <Input value={l.discount} onChange={(e) => update(i, { discount: e.target.value })} inputMode="decimal" placeholder="0" />
                  </label>
                  <p className="tabular col-span-2 text-right font-semibold sm:col-span-1">{formatCOP(c.total)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {err.items && <p role="alert" className="text-sm text-danger">{err.items}</p>}
      </div>

      <div className="grid content-start gap-4 rounded-xl border border-border bg-bg-subtle/40 p-4">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Cliente</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg-subtle p-1 text-xs">
            {([["final", "Consumidor final"], ["existing", "Existente"], ["new", "Nuevo"]] as const).map(([k, label]) => (
              <label key={k} className={cn("cursor-pointer rounded-md px-2 py-1.5 text-center font-medium", mode === k ? "bg-surface text-fg shadow-card" : "text-fg-muted")}>
                <input type="radio" name="customer-mode" value={k} checked={mode === k} onChange={() => setMode(k)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
          {mode === "existing" && (
            <Field id="sale-customer" label="Elige el cliente" error={err.customerId}>
              <Select id="sale-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Elige…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.documentNumber ? ` · ${c.documentType ?? ""} ${c.documentNumber}` : ""}</option>)}
              </Select>
            </Field>
          )}
          {mode === "new" && (
            <div className="grid gap-3">
              <Field id="c-name" label="Nombre o razón social" error={err["customer.name"]}>
                <Input id="c-name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                <Field id="c-doctype" label="Tipo" error={err["customer.documentType"]}>
                  <Select id="c-doctype" value={customer.documentType} onChange={(e) => setCustomer({ ...customer, documentType: e.target.value })}>
                    {["CC", "NIT", "CE", "PASAPORTE", "PPT", "OTRO"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field id="c-doc" label="Documento (opcional)" error={err["customer.documentNumber"]}>
                  <Input id="c-doc" value={customer.documentNumber} onChange={(e) => setCustomer({ ...customer, documentNumber: e.target.value })} inputMode="numeric" />
                </Field>
              </div>
              <Field id="c-email" label="Correo (opcional)" error={err["customer.email"]}>
                <Input id="c-email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </Field>
              <Field id="c-phone" label="Celular (opcional)" error={err["customer.phone"]}>
                <Input id="c-phone" type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </Field>
            </div>
          )}
        </fieldset>
        <Field id="sale-method" label="Medio de pago" error={err.paymentMethod}>
          <Select id="sale-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CARD">Tarjeta</option>
            <option value="OTHER">Otro</option>
          </Select>
        </Field>
        <Field id="sale-notes" label="Nota (opcional)" error={err.notes}>
          <Input id="sale-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <dl className="grid gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd className="tabular">{formatCOP(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div className="flex justify-between"><dt className="text-fg-muted">Descuentos (incluidos)</dt><dd className="tabular">−{formatCOP(totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-fg-muted">IVA</dt><dd className="tabular">{formatCOP(totals.tax)}</dd></div>
          <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd className="tabular" data-testid="sale-total">{formatCOP(totals.subtotal + totals.tax)}</dd></div>
        </dl>
        <SubmitButton size="lg" loading={pending} disabled={lines.length === 0 || computed.some((x) => x.short)}>Registrar venta</SubmitButton>
        <p className="text-xs text-fg-muted">Al registrarla se descuenta el inventario de la sede y el valor entra a la caja de hoy.</p>
      </div>
    </form>
  );
}

/** Anular una venta (con motivo). */
export function VoidSaleForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(voidSaleAction.bind(null, id), null);
  if (state?.ok) return <p role="status" className="text-sm text-success">{state.message}</p>;
  if (!open) return <Button variant="ghost" onClick={() => setOpen(true)}>Anular venta</Button>;
  return (
    <form
      className="grid gap-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <Field id="void-reason" label="Motivo de la anulación" error={state?.fieldErrors?.reason}>
        <Input id="void-reason" name="reason" placeholder="Ej.: el cliente devolvió el producto" autoFocus />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="secondary" loading={pending}>Confirmar anulación</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
      {state?.message && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
    </form>
  );
}
