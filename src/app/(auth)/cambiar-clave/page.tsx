import type { Metadata } from "next";
import { requireActor } from "@/server/current";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function ChangePasswordPage() {
  const actor = await requireActor({ allowPending: true });
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{actor.mustChangePassword ? "Crea tu contraseña" : "Cambiar contraseña"}</h1>
      <p className="mt-1 mb-8 text-sm text-fg-muted">
        {actor.mustChangePassword
          ? "Estás usando una contraseña temporal. Crea una propia que solo tú conozcas."
          : "Al cambiarla, se cerrará la sesión en tus otros dispositivos."}
      </p>
      <PasswordForm />
    </>
  );
}
