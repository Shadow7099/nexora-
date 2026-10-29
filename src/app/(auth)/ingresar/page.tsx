import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/current";
import { homeFor } from "@/server/sessions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/ingresar">) {
  const actor = await getCurrentActor();
  if (actor) redirect(homeFor(actor.role));
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-1 mb-8 text-sm text-fg-muted">Usa el correo y la contraseña que te dio tu empresa.</p>
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-8 text-center text-xs text-fg-subtle">¿Olvidaste tu contraseña? Pídele a tu administrador que la restablezca.</p>
    </>
  );
}
