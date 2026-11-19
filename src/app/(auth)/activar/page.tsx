import { redirect } from "next/navigation";

/** Dirección anterior del ingreso con código: hoy todo está en /ingresar. */
export default function ActivatePage() {
  redirect("/ingresar");
}
