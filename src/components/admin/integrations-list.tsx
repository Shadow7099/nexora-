import { ShieldCheck, TriangleAlert } from "lucide-react";
import { IntegrationCard, type IntegrationState } from "@/components/admin/integration-card";
import { INTEGRATIONS } from "@/lib/integration-catalog";

type Item = Omit<IntegrationState, "testedAt"> & { id: string; testedAt: Date | null };

/** Lista de integraciones agrupadas (empresa o plataforma). */
export function IntegrationsList({ scope, items, encryptionReady, databaseReady }: { scope: "company" | "platform"; items: Item[]; encryptionReady: boolean; databaseReady: boolean }) {
  if (!databaseReady) {
    return (
      <p role="alert" className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-fg">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        Las integraciones se están activando en el servidor. Vuelve a intentarlo en unos minutos o avísale al soporte de Nexora.
      </p>
    );
  }
  const groups = [...new Set(items.map((i) => INTEGRATIONS.find((p) => p.id === i.id)!.group))];
  return (
    <div className="grid gap-8">
      {encryptionReady ? (
        <p className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-fg">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Los tokens y llaves se guardan cifrados y nunca se vuelven a mostrar. Para cambiar uno, escribe el nuevo; si dejas el campo vacío, se conserva el guardado.
        </p>
      ) : (
        <p role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-fg">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          Falta la clave de cifrado del servidor (NEXORA_SECRETS_KEY). Hasta configurarla no se pueden guardar tokens. Avísale al soporte de Nexora.
        </p>
      )}
      {groups.map((g) => (
        <section key={g} aria-labelledby={`grupo-${g}`} className="grid gap-4">
          <h2 id={`grupo-${g}`} className="text-sm font-semibold tracking-wide text-fg-subtle uppercase">{g}</h2>
          {items
            .filter((i) => INTEGRATIONS.find((p) => p.id === i.id)!.group === g)
            .map((i) => (
              <IntegrationCard
                key={i.id}
                scope={scope}
                provider={INTEGRATIONS.find((p) => p.id === i.id)!}
                state={{ ...i, testedAt: i.testedAt ? i.testedAt.toISOString() : null }}
                disabled={!encryptionReady}
              />
            ))}
        </section>
      ))}
    </div>
  );
}
