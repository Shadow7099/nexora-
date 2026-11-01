import { Construction } from "lucide-react";

/** Aviso honesto en módulos que aún no están completos: qué se ve ya y qué falta. */
export function PhaseNotice({ phase, children }: { phase: number; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm">
      <Construction className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <div className="text-fg">
        <p className="font-medium">Módulo en construcción · se completa en la fase {phase}</p>
        <div className="mt-0.5 text-fg-muted">{children}</div>
      </div>
    </div>
  );
}
