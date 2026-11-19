import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/current";
import { homeFor } from "@/server/sessions";
import { ActivateForm } from "./activate-form";

export const metadata: Metadata = { title: "Activar celular" };

export default async function ActivatePage() {
  const actor = await getCurrentActor();
  if (actor && actor.role !== "EMPLOYEE") redirect(homeFor(actor.role));
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Activa tu celular</h1>
      <p className="mt-1 mb-8 text-sm text-fg-muted">
        Escribe tu cédula y el código que te envió tu empresa. Después activas tu huella o Face ID y con eso entras y marcas. Si tenías otro celular, este lo reemplaza.
      </p>
      <ActivateForm />
      <p className="mt-6 text-center text-sm text-fg-muted">
        ¿Ya activaste este celular? <Link href="/ingresar" className="font-medium text-primary hover:underline">Entra con Face ID o huella</Link>
      </p>
    </>
  );
}
