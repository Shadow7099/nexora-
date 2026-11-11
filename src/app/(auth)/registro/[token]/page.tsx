import type { Metadata } from "next";
import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { checkInvitation } from "@/server/registration";
import { RegisterForm } from "../register-form";

export const metadata: Metadata = { title: "Registra tu empresa", robots: { index: false } };

const reasons = {
  invalid: "Este link no es válido. Revisa que lo hayas copiado completo.",
  used: "Este link ya se usó para registrar una empresa. Si es la tuya, ingresa con tu correo.",
  expired: "Este link venció. Pide uno nuevo a Nexora.",
  revoked: "Este link fue anulado. Pide uno nuevo a Nexora.",
} as const;

/** Registro de una empresa con link de invitación (pública: no requiere sesión). */
export default async function RegisterPage({ params }: PageProps<"/registro/[token]">) {
  const { token } = await params;
  const inv = await checkInvitation(token);
  if (!inv.ok) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-bg-subtle text-fg-muted ring-1 ring-border"><LinkIcon className="size-6" aria-hidden /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Link no disponible</h1>
        <p className="mt-2 text-sm text-fg-muted">{reasons[inv.reason]}</p>
        <Link href="/ingresar" className={buttonVariants({ variant: "secondary", className: "mt-6" })}>Ir al ingreso</Link>
      </div>
    );
  }
  const until = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" }).format(inv.expiresAt);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Registra tu empresa</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">
        Crea tu cuenta y configura tu negocio tú mismo: sedes, QR, turnos y empleados. Toma unos 20 minutos. Este link sirve una sola vez, hasta el {until}.
      </p>
      <RegisterForm token={token} />
      <p className="mt-6 text-center text-sm text-fg-muted">¿Ya tienes cuenta? <Link href="/ingresar" className="text-primary hover:underline">Ingresa</Link></p>
    </>
  );
}
