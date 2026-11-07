"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/(auth)/registro/actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";

export function RegisterForm({ token }: { token: string }) {
  const [state, action] = useActionState(registerAction.bind(null, token), null);
  const err = state?.fieldErrors ?? {};
  const v = state?.data ?? {};
  const field = (id: string, label: string, props: React.ComponentProps<"input"> = {}, hint?: string) => (
    <Field id={id} label={label} error={err[id]} hint={hint}>
      <Input id={id} name={id} defaultValue={props.type === "password" ? undefined : v[id]} aria-invalid={!!err[id] || undefined} {...props} />
    </Field>
  );
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} />
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">Tu negocio</legend>
        {field("companyName", "Nombre del negocio", { autoComplete: "organization" })}
        {field("legalName", "Razón social (opcional)")}
        {field("nit", "NIT (opcional)", { inputMode: "numeric" })}
      </fieldset>
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">Tu cuenta de administrador</legend>
        {field("adminName", "Tu nombre completo", { autoComplete: "name" })}
        {field("email", "Correo", { type: "email", autoComplete: "email" }, "Con este correo ingresarás a Nexora.")}
        {field("password", "Contraseña", { type: "password", autoComplete: "new-password" }, "Mínimo 10 caracteres, con letras.")}
        {field("confirm", "Repite la contraseña", { type: "password", autoComplete: "new-password" })}
      </fieldset>
      <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--primary)]" aria-invalid={!!err.terms || undefined} />
        <span className="text-fg-muted">
          Soy el responsable de este negocio. Entiendo que Nexora es una herramienta de control de asistencia y de <strong className="font-medium text-fg">estimación</strong> de nómina, que no reemplaza a un contador, y que como empleador soy responsable del tratamiento de los datos de mis empleados (Ley 1581 de 2012).
          {err.terms && <span className="mt-1 block text-xs text-danger" role="alert">{err.terms}</span>}
        </span>
      </label>
      <SubmitButton size="lg" className="w-full" pendingText="Creando tu cuenta…">Crear mi empresa</SubmitButton>
    </form>
  );
}
