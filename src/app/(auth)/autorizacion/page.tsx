import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/current";
import { CONSENT_POLICY_VERSION, homeFor } from "@/server/sessions";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = { title: "Autorización de datos" };

// TEXTO BORRADOR: debe revisarlo un abogado antes del piloto (Ley 1581 de 2012 y Decreto 1377 de 2013).
const items = [
  ["Qué datos", "Nombre, documento, cargo, correo, teléfono, horarios, marcaciones de entrada y salida, y la ubicación del celular en el momento de marcar."],
  ["Para qué", "Controlar la asistencia, calcular la jornada y las horas extra, y preparar la estimación de nómina de tu empleador."],
  ["Ubicación", "Solo se toma cuando tú marcas entrada o salida. No hay rastreo continuo."],
  ["Biometría", "No se recogen huellas ni fotos. Si usas huella o rostro en tu celular, lo verifica el propio celular; Nexora no los recibe."],
  ["Tus derechos", "Conocer, actualizar, rectificar y pedir la supresión de tus datos, y revocar esta autorización, escribiendo al responsable del tratamiento (tu empleador)."],
] as const;

export default async function ConsentPage() {
  const actor = await requireActor({ allowPending: true });
  if (actor.hasConsent) redirect(actor.mustChangePassword ? "/cambiar-clave" : homeFor(actor.role));
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Autorización de tratamiento de datos</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">
        {actor.companyName ?? "Tu empresa"} usa Nexora para el control de asistencia. Antes de continuar, revisa cómo se usan tus datos.
      </p>
      <dl className="mb-6 grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm shadow-card">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="font-medium text-fg">{k}</dt>
            <dd className="mt-0.5 text-fg-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <ConsentForm />
      <p className="mt-4 text-center text-xs text-fg-subtle">Versión de la política: {CONSENT_POLICY_VERSION}</p>
    </>
  );
}
