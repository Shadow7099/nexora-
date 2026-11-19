"use client";

import { useActionState } from "react";
import { KeyRound, ScanFace, Smartphone, UserCheck, UserX } from "lucide-react";
import { addContractAction, regenerateAccessCodeAction, requirePasskeyAction, setStatusAction, updateEmployeeAction } from "@/app/admin/actions";
import { ContractFields, EmployeeFields } from "@/components/admin/employee-fields";
import { ActivationCode } from "@/components/admin/activation-code";
import { TempPassword } from "@/components/admin/temp-password";
import { FormAlert, SubmitButton } from "@/components/ui/form";

type Values = Record<string, string | undefined>;

export function EditEmployeeForm({ id, values, sites }: { id: string; values: Values; sites: { id: string; name: string }[] }) {
  const [state, action] = useActionState(updateEmployeeAction.bind(null, id), null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <EmployeeFields errors={state?.fieldErrors ?? {}} values={state?.ok === false && state.data ? state.data : values} sites={sites} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}

export function NewContractForm({ id, values }: { id: string; values: Values }) {
  const [state, action] = useActionState(addContractAction.bind(null, id), null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <ContractFields errors={state?.fieldErrors ?? {}} values={state?.ok === false && state.data ? state.data : values} />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" pendingText="Registrando…">Registrar nuevas condiciones</SubmitButton>
      </div>
    </form>
  );
}

export function StatusButton({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(setStatusAction.bind(null, id, active ? "INACTIVE" : "ACTIVE"), null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (active && !confirm("¿Desactivar este empleado? Perderá el acceso de inmediato. Su historial se conserva.")) e.preventDefault();
      }}
      className="grid gap-2"
    >
      <SubmitButton variant={active ? "danger" : "secondary"}>
        {active ? <UserX /> : <UserCheck />} {active ? "Desactivar" : "Reactivar"}
      </SubmitButton>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </form>
  );
}

/** Código de acceso del empleado: verlo, enviarlo o cambiarlo. */
export function AccessCodePanel({ id, code, phone, name }: { id: string; code: string | null; phone?: string; name?: string }) {
  const [state, action] = useActionState(regenerateAccessCodeAction.bind(null, id), null);
  const current = state?.data?.code ?? code;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (current && !confirm("¿Cambiar el código? El anterior deja de servir y se cierran sus sesiones: tendrá que entrar con el nuevo.")) e.preventDefault();
      }}
      className="grid gap-3"
    >
      {current ? <ActivationCode code={current} phone={phone} name={name} /> : <p className="text-sm text-fg-muted">Este empleado aún no tiene código de acceso.</p>}
      <SubmitButton variant="secondary">
        <Smartphone /> {current ? "Cambiar código" : "Generar código de acceso"}
      </SubmitButton>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </form>
  );
}

/** El administrador decide si a este empleado se le exige Face ID o huella para marcar. */
export function PasskeyRequirement({ id, required }: { id: string; required: boolean }) {
  const [state, action] = useActionState(requirePasskeyAction.bind(null, id, !required), null);
  return (
    <form action={action} className="grid gap-2 rounded-xl border border-border p-3">
      <p className="text-sm">
        <span className="font-medium">Face ID o huella para marcar:</span> {required ? "obligatorio" : "opcional"}
      </p>
      <p className="text-xs text-fg-muted">
        {required ? "Debe activarlo en su celular antes de poder marcar." : "Puede marcar con su código y su celular; si quiere, activa el Face ID por su cuenta."}
      </p>
      <SubmitButton variant="secondary" size="sm">
        <ScanFace /> {required ? "Hacerlo opcional" : "Exigir Face ID o huella"}
      </SubmitButton>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </form>
  );
}
