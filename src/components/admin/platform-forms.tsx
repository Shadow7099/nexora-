"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createCompanyAction, resetAdminPasswordAction, setCompanyStatusAction } from "@/app/plataforma/empresas-actions";
import { TempPassword } from "@/components/admin/temp-password";
import { buttonVariants } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";

/** Alta de empresa con su primer administrador. */
export function NewCompanyForm() {
  const [state, action] = useActionState(createCompanyAction, null);
  if (state?.ok && state.data) {
    return (
      <div className="grid gap-4">
        <FormAlert tone="success" message={`${state.message} El administrador debe ingresar con esta contraseña temporal y crear la suya.`} />
        <TempPassword password={state.data.password!} email={state.data.email} recipient="al administrador de la empresa" />
        <div className="flex flex-wrap gap-2">
          <Link href={`/plataforma/empresas/${state.data.companyId}`} className={buttonVariants()}>Ver la empresa</Link>
          <Link href="/plataforma" className={buttonVariants({ variant: "secondary" })}>Volver a empresas</Link>
        </div>
      </div>
    );
  }
  const err = state?.fieldErrors ?? {};
  const v = state?.data ?? {};
  const field = (id: string, label: string, props: React.ComponentProps<"input"> = {}, hint?: string) => (
    <Field id={id} label={label} error={err[id]} hint={hint}>
      <Input id={id} name={id} defaultValue={v[id]} aria-invalid={!!err[id] || undefined} {...props} />
    </Field>
  );
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert message={state?.message} />
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">Empresa</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("name", "Nombre comercial")}
          {field("legalName", "Razón social (opcional)")}
          {field("nit", "NIT (opcional)", { inputMode: "numeric" })}
          {field("planCode", "Plan (opcional)", {}, "Ej.: piloto, básico. Aún sin cobro.")}
          {field("maxSites", "Límite de sedes (opcional)", { inputMode: "numeric" })}
          {field("maxEmployees", "Límite de empleados (opcional)", { inputMode: "numeric" })}
        </div>
      </fieldset>
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">Primer administrador</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("adminName", "Nombre completo")}
          {field("adminEmail", "Correo", { type: "email", autoComplete: "off" })}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton pendingText="Creando…">Crear empresa</SubmitButton>
      </div>
    </form>
  );
}

const STATUS_ACTIONS = [
  { status: "ACTIVE", label: "Activar" },
  { status: "TRIAL", label: "Pasar a prueba" },
  { status: "SUSPENDED", label: "Suspender" },
] as const;

export function CompanyStatusButtons({ id, current }: { id: string; current: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_ACTIONS.filter((a) => a.status !== current).map((a) => <StatusButton key={a.status} id={id} status={a.status} label={a.label} />)}
    </div>
  );
}

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  const [state, action] = useActionState(setCompanyStatusAction.bind(null, id, status), null);
  return (
    <form action={action} className="grid gap-1">
      <SubmitButton variant={status === "SUSPENDED" ? "danger" : "secondary"} size="sm" pendingText="Guardando…">{label}</SubmitButton>
      {state?.message && !state.ok && <span className="text-xs text-danger" role="alert">{state.message}</span>}
    </form>
  );
}

export function ResetAdminPassword({ companyId, userId, name }: { companyId: string; userId: string; name: string }) {
  const [state, action] = useActionState(resetAdminPasswordAction.bind(null, companyId, userId), null);
  if (state?.ok && state.data) return <TempPassword password={state.data.password!} email={state.data.email} recipient="al administrador" />;
  return (
    <form action={action} className="grid gap-1">
      <SubmitButton variant="secondary" size="sm" pendingText="Generando…" aria-label={`Restablecer contraseña de ${name}`}>Restablecer contraseña</SubmitButton>
      {state?.message && <span className="text-xs text-danger" role="alert">{state.message}</span>}
    </form>
  );
}
