import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/current";
import { homeFor } from "@/server/sessions";
import { LoginForm } from "./login-form";
import { PasskeyLogin } from "./passkey-login";
import { ActivateForm } from "../activar/activate-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/ingresar">) {
  const actor = await getCurrentActor();
  if (actor) redirect(homeFor(actor.role));
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">Empleados: escribe el código que te dio tu empresa.</p>
      <ActivateForm next={typeof next === "string" ? next : undefined} />
      <div className="mt-3">
        <PasskeyLogin next={typeof next === "string" ? next : undefined} />
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-fg-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" /> Administradores <span className="h-px flex-1 bg-border" />
      </div>
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-6 text-center text-sm text-fg-muted">¿Tu negocio aún no usa Nexora? <Link href="/registro" className="font-medium text-primary hover:underline">Crea tu cuenta</Link></p>
    </>
  );
}
