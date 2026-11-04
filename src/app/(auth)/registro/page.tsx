import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/current";
import { SELF_SIGNUP_LIMITS } from "@/server/onboarding";
import { homeFor } from "@/server/sessions";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignupPage() {
  const actor = await getCurrentActor();
  if (actor) redirect(homeFor(actor.role));
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Crea la cuenta de tu empresa</h1>
      <p className="mt-1 mb-8 text-sm text-fg-muted">
        Prueba gratis hasta {SELF_SIGNUP_LIMITS.maxEmployees} empleados y {SELF_SIGNUP_LIMITS.maxSites} sedes. En minutos dejas lista tu sede, turnos, empleados y horarios.
      </p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-fg-muted">
        ¿Ya tienes cuenta? <Link href="/ingresar" className="text-primary hover:underline">Ingresar</Link>
      </p>
    </>
  );
}
