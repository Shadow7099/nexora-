"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createEmployeeAction } from "@/app/admin/actions";
import { ContractFields, EmployeeFields } from "@/components/admin/employee-fields";
import { TempPassword } from "@/components/admin/temp-password";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert, SubmitButton } from "@/components/ui/form";

const today = () => new Date().toISOString().slice(0, 10);

type Sites = { id: string; name: string }[];

export function NewEmployeeForm({ sites }: { sites: Sites }) {
  // Cambiar la key reinicia el formulario (y su estado) para crear otro empleado.
  const [round, setRound] = useState(0);
  return <Form key={round} sites={sites} onAnother={() => setRound((r) => r + 1)} />;
}

function Form({ sites, onAnother }: { sites: Sites; onAnother: () => void }) {
  const [state, action] = useActionState(createEmployeeAction, null);

  if (state?.ok && state.data?.password) {
    return (
      <Card className="max-w-xl">
        <CardContent className="grid gap-5">
          <div>
            <h2 className="text-lg font-semibold">Empleado creado</h2>
            <p className="mt-1 text-sm text-fg-muted">Ya puede ingresar con su correo y esta contraseña.</p>
          </div>
          <TempPassword password={state.data.password} email={state.data.email} />
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/empleados/${state.data.employeeId}`} className={buttonVariants()}>Ver empleado</Link>
            <button type="button" onClick={onAnother} className={buttonVariants({ variant: "secondary" })}>Crear otro</button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const values = state?.data ?? { documentType: "CC", hireDate: today(), startDate: today(), contractType: "INDEFINIDO", salaryType: "ORDINARIO", payFrequency: "QUINCENAL", arlRiskClass: "I", weeklyHours: "42", defaultSiteId: sites.length === 1 ? sites[0]!.id : undefined };
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormAlert message={state?.message} />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Datos personales y acceso</CardTitle>
            <CardDescription>El correo será su usuario para ingresar.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <EmployeeFields errors={errors} values={values} sites={sites} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Contrato</CardTitle>
            <CardDescription>Se usa para la pre-nómina estimada. Los cambios futuros crean una nueva versión, sin borrar la anterior.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ContractFields errors={errors} values={values} />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Link href="/admin/empleados" className={buttonVariants({ variant: "ghost" })}>Cancelar</Link>
        <SubmitButton pendingText="Creando…">Crear empleado</SubmitButton>
      </div>
    </form>
  );
}
