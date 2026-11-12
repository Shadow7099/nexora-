import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/current";
import { homeFor } from "@/server/sessions";

/**
 * Con la sesión iniciada, la dirección principal trae aquí: cada quien va a su
 * inicio (el empleado, directo a marcar) sin volver a escribir sus credenciales.
 */
export default async function Inicio() {
  const actor = await getCurrentActor();
  redirect(actor ? homeFor(actor.role) : "/ingresar");
}
