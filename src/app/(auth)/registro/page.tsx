import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crea tu cuenta" };

/** Registro abierto desde la página de inicio: el dueño crea su empresa y su cuenta. */
export default function OpenRegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">
        Registra tu negocio y configúralo tú mismo: sedes, QR, turnos y empleados. Toma unos 20 minutos y empiezas en modo prueba.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-fg-muted">¿Ya tienes cuenta? <Link href="/ingresar" className="text-primary hover:underline">Ingresa</Link></p>
    </>
  );
}
