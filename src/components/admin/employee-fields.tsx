import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { contractTypeLabel, documentTypeLabel, payFrequencyLabel, salaryTypeLabel } from "@/lib/labels";

type Errors = Record<string, string>;
type Values = Record<string, string | undefined>;

/** Campo de texto con etiqueta y error accesible. */
function F({ name, label, errors, values, hint, ...props }: { name: string; label: string; errors: Errors; values: Values; hint?: string } & React.ComponentProps<"input">) {
  const err = errors[name];
  return (
    <Field id={name} label={label} error={err} hint={hint}>
      <Input id={name} name={name} defaultValue={values[name]} aria-invalid={!!err || undefined}
        aria-describedby={err ? `${name}-error` : hint ? `${name}-hint` : undefined} {...props} />
    </Field>
  );
}

function S({ name, label, errors, values, options }: { name: string; label: string; errors: Errors; values: Values; options: Record<string, string> | { id: string; name: string }[] }) {
  const err = errors[name];
  const entries = Array.isArray(options) ? options.map((o) => [o.id, o.name] as const) : Object.entries(options);
  return (
    <Field id={name} label={label} error={err}>
      <Select id={name} name={name} defaultValue={values[name] ?? ""} aria-invalid={!!err || undefined} aria-describedby={err ? `${name}-error` : undefined}>
        <option value="" disabled>Selecciona…</option>
        {entries.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Select>
    </Field>
  );
}

export function EmployeeFields({ errors, values, sites }: { errors: Errors; values: Values; sites: { id: string; name: string }[] }) {
  const p = { errors, values };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <F name="firstName" label="Nombres" autoComplete="off" required {...p} />
      <F name="lastName" label="Apellidos" autoComplete="off" required {...p} />
      <S name="documentType" label="Tipo de documento" options={documentTypeLabel} {...p} />
      <F name="documentNumber" label="Número de documento" inputMode="numeric" required {...p} />
      <F name="email" label="Correo (para ingresar)" type="email" inputMode="email" required {...p} />
      <F name="phone" label="Celular" type="tel" inputMode="tel" {...p} />
      <F name="position" label="Cargo" required {...p} />
      <S name="defaultSiteId" label="Sede habitual" options={sites} {...p} />
      <F name="hireDate" label="Fecha de ingreso" type="date" required {...p} />
    </div>
  );
}

export function ContractFields({ errors, values }: { errors: Errors; values: Values }) {
  const p = { errors, values };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <S name="contractType" label="Tipo de contrato" options={contractTypeLabel} {...p} />
      <S name="salaryType" label="Tipo de salario" options={salaryTypeLabel} {...p} />
      <F name="monthlySalary" label="Salario mensual (COP)" inputMode="numeric" required hint="Sin puntos ni signos. Ej.: 1750905" {...p} />
      <F name="weeklyHours" label="Horas semanales pactadas" inputMode="decimal" required {...p} />
      <S name="payFrequency" label="Frecuencia de pago" options={payFrequencyLabel} {...p} />
      <S name="arlRiskClass" label="Clase de riesgo ARL" options={{ I: "I", II: "II", III: "III", IV: "IV", V: "V" }} {...p} />
      <F name="startDate" label="Vigente desde" type="date" required {...p} />
    </div>
  );
}
