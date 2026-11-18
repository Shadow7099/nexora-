import { TriangleAlert } from "lucide-react";

/** Aviso cuando un módulo nuevo aún no está activado en la base de datos de esta instalación. */
export function ModulePending({ name }: { name: string }) {
  return (
    <p role="alert" className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-fg">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      {name} se está activando en el servidor. Vuelve a intentarlo en unos minutos o avísale al soporte de Nexora.
    </p>
  );
}
