"use client";

import Link from "next/link";
import { ArrowRight, Check, Copy, Printer } from "lucide-react";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { contractTypeLabel, payFrequencyLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { BulkResult } from "@/server/onboarding";
import { wizardEmployeesAction, wizardPresetsAction, wizardScheduleAction } from "./actions";

const chip = "inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-fg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:ring-4 peer-focus-visible:ring-ring";
const DAYS = [[1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [7, "Dom"]] as const;

// ─────────────────────────── Paso 2: turnos ───────────────────────────

type Preset = { key: string; name: string; start: string; end: string; breakMinutes: number; exists: boolean };

export function PresetsForm({ presets }: { presets: Preset[] }) {
  const [state, action] = useActionState(wizardPresetsAction, null);
  const pending = presets.filter((p) => !p.exists);
  if (pending.length === 0) return <p className="text-sm text-fg-muted">Ya creaste todos los turnos sugeridos.</p>;
  return (
    <form action={action} className="grid gap-4">
      <FormAlert message={state?.message} />
      <div className="grid gap-2 sm:grid-cols-2">
        {pending.map((p, i) => (
          <label key={p.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm shadow-card has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
            <input type="checkbox" name="presets" value={p.key} defaultChecked={i === 0} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              <span className="block font-medium text-fg">{p.name}</span>
              <span className="text-xs text-fg-muted">{p.start} a {p.end}{p.breakMinutes ? ` · ${p.breakMinutes} min de descanso` : " · sin descanso"}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Creando…">Crear turnos y continuar <ArrowRight /></SubmitButton>
      </div>
    </form>
  );
}

// ─────────────────────────── Paso 3: empleados ───────────────────────────

const EXAMPLE = "Juan; Pérez Gómez; 1020304050; juan@correo.com; Panadero; 1750905; 3001234567\nLaura; Ríos; 52123456; laura@correo.com; Cajera; 1800000";

export function BulkEmployeesForm({ sites, today, existing, max }: { sites: { id: string; name: string }[]; today: string; existing: number; max: number | null }) {
  const [state, action] = useActionState(wizardEmployeesAction, null);
  const [created, setCreated] = useState<BulkResult["created"]>([]);
  const [lastResult, setLastResult] = useState<string | undefined>();
  const v = state?.data ?? {};
  const err = state?.fieldErrors ?? {};
  // Acumula las cuentas creadas en envíos sucesivos (p. ej. tras corregir líneas con error).
  if (v.result && v.result !== lastResult) {
    const r = JSON.parse(v.result) as BulkResult;
    setLastResult(v.result);
    setCreated((c) => [...c, ...r.created]);
  }
  const failed: BulkResult["failed"] = v.result ? (JSON.parse(v.result) as BulkResult).failed : [];

  return (
    <div className="grid gap-6">
      {created.length > 0 && <CreatedAccounts rows={created} />}

      <form action={action} className="grid gap-4" noValidate>
        <FormAlert message={state?.message} />
        {failed.length > 0 && (
          <ul className="grid gap-1 rounded-lg border border-danger/30 bg-danger-soft p-3 text-xs text-danger" role="alert">
            {failed.map((f) => <li key={f.line}><strong>Línea {f.line}:</strong> {f.error}</li>)}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="defaultSiteId" label="Sede" error={err.defaultSiteId}>
            <Select id="defaultSiteId" name="defaultSiteId" defaultValue={v.defaultSiteId ?? sites[0]?.id}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field id="hireDate" label="Fecha de ingreso" error={err.hireDate}>
            <Input id="hireDate" name="hireDate" type="date" defaultValue={v.hireDate ?? today} />
          </Field>
          <Field id="contractType" label="Contrato" error={err.contractType}>
            <Select id="contractType" name="contractType" defaultValue={v.contractType ?? "INDEFINIDO"}>
              {Object.entries(contractTypeLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field id="payFrequency" label="Pago" error={err.payFrequency}>
            <Select id="payFrequency" name="payFrequency" defaultValue={v.payFrequency ?? "QUINCENAL"}>
              {Object.entries(payFrequencyLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <input type="hidden" name="weeklyHours" value={v.weeklyHours ?? "42"} />
        <Field id="lines" label="Empleados" error={err.lines} hint="Orden: Nombres; Apellidos; Cédula; Correo; Cargo; Salario mensual; Celular (opcional). Separa con punto y coma, coma o tabulador (al pegar desde Excel).">
          <textarea
            id="lines" name="lines" rows={8} defaultValue={v.lines} placeholder={EXAMPLE} spellCheck={false}
            aria-invalid={!!err.lines || undefined} aria-describedby={err.lines ? "lines-error" : "lines-hint"}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg shadow-card placeholder:text-fg-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring aria-invalid:border-danger"
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-fg-subtle">
            {existing} empleado(s) activo(s){max != null ? ` de ${max} que permite tu plan` : ""}. Tipo de documento: cédula; ARL clase I y 42 h semanales (ajustables por empleado).{" "}
            <Link href="/admin/empleados/nuevo" className="text-primary hover:underline">Crear uno con todos los datos</Link>
          </p>
          <div className="flex gap-2">
            {existing > 0 && <Link href="/admin/bienvenida?paso=horarios" className={buttonVariants({ variant: "secondary" })}>Continuar <ArrowRight /></Link>}
            <SubmitButton pendingText="Creando cuentas…">Crear cuentas</SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}

function CreatedAccounts({ rows }: { rows: BulkResult["created"] }) {
  const [copied, setCopied] = useState(false);
  const text = rows.map((r) => `${r.name}\t${r.email}\t${r.password}`).join("\n");
  return (
    <div role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-success">{rows.length} cuenta(s) creada(s). Copia o imprime estas contraseñas temporales: no se volverán a mostrar.</p>
        <div className="flex gap-2 print:hidden">
          <Button type="button" variant="secondary" size="sm" onClick={async () => { await navigator.clipboard?.writeText(text); setCopied(true); }}>
            {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar todo"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}><Printer /> Imprimir</Button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm" data-testid="created-accounts">
          <thead>
            <tr className="border-b border-border text-left text-xs text-fg-subtle">
              <th className="px-3 py-2 font-medium">Empleado</th>
              <th className="px-3 py-2 font-medium">Usuario (correo)</th>
              <th className="px-3 py-2 font-medium">Contraseña temporal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-fg-muted">{r.email}</td>
                <td className="px-3 py-2 font-mono tracking-wider">{r.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────── Paso 4: horarios ───────────────────────────

type Emp = { id: string; name: string; position: string; hasSchedule: boolean };

export function BulkScheduleForm({ templates, employees }: { templates: { id: string; label: string }[]; employees: Emp[] }) {
  const [state, action] = useActionState(wizardScheduleAction, null);
  const err = state?.fieldErrors ?? {};
  const pending = employees.filter((e) => !e.hasSchedule);
  return (
    <form action={action} className="grid gap-5">
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <Field id="templateId" label="Turno" error={err.templateId}>
        <Select id="templateId" name="templateId" defaultValue={templates[0]?.id}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Días que trabaja</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(([n, label]) => (
            <label key={n} className="cursor-pointer">
              <input type="checkbox" name="weekdays" value={n} defaultChecked={n <= 5} className="peer sr-only" />
              <span className={chip}>{label}</span>
            </label>
          ))}
        </div>
        {err.weekdays && <p className="text-xs text-danger" role="alert">{err.weekdays}</p>}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Empleados</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {employees.map((e) => (
            <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <input type="checkbox" name="employeeIds" value={e.id} defaultChecked={!e.hasSchedule} className="size-4 accent-[var(--primary)]" />
              <span className="min-w-0 flex-1 truncate">{e.name} <span className="text-fg-subtle">· {e.position}</span></span>
              {e.hasSchedule && <span className="text-xs text-success">con horario</span>}
            </label>
          ))}
        </div>
        {err.employeeIds && <p className="text-xs text-danger" role="alert">{err.employeeIds}</p>}
      </fieldset>
      <div className={cn("flex flex-wrap items-center gap-2", pending.length ? "justify-end" : "justify-between")}>
        {pending.length === 0 && <p className="text-sm text-success">Todos tus empleados tienen horario.</p>}
        <div className="flex gap-2">
          {pending.length === 0 && <Link href="/admin/bienvenida?paso=listo" className={buttonVariants()}>Continuar <ArrowRight /></Link>}
          <SubmitButton variant={pending.length ? "primary" : "secondary"} pendingText="Asignando…">Asignar horario</SubmitButton>
        </div>
      </div>
    </form>
  );
}
