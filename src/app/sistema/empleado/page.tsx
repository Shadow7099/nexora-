import type { Metadata } from "next";
import { EmployeeShell } from "@/components/layout/employee-shell";
import { PunchButton, PunchCard } from "@/components/employee/punch-card";

export const metadata: Metadata = { title: "Vista previa · Empleado" };

// Vista previa del diseño. La marcación real (QR + ubicación + dispositivo) llega en la fase 4.
export default function EmployeePreview() {
  return (
    <EmployeeShell>
      <PunchCard
        greeting="Hola"
        firstName="Juan"
        siteName="Villavicencio Centro"
        schedule="8:00 a. m. – 5:00 p. m."
        state={{ kind: "pending-in" }}
        action={<PunchButton kind="in" type="button" disabled title="Disponible en la fase 4" />}
      />
      <p className="mt-4 text-center text-xs text-fg-subtle">Vista previa del diseño · la marcación se activa en la fase 4</p>
    </EmployeeShell>
  );
}
