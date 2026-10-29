"use client";

import { useActionState } from "react";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { addContractAction, resetPasswordAction, setStatusAction, updateEmployeeAction } from "@/app/admin/actions";
import { ContractFields, EmployeeFields } from "@/components/admin/employee-fields";
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

export function ResetPasswordButton({ id }: { id: string }) {
  const [state, action] = useActionState(resetPasswordAction.bind(null, id), null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("¿Restablecer la contraseña? Se cerrarán sus sesiones y deberá crear una nueva al ingresar.")) e.preventDefault();
      }}
      className="grid gap-3"
    >
      <SubmitButton variant="secondary">
        <KeyRound /> Restablecer contraseña
      </SubmitButton>
      {state?.data?.password && <TempPassword password={state.data.password} />}
      {state?.ok === false && <FormAlert message={state.message} />}
    </form>
  );
}
