import { cn } from "@/lib/utils";

/** Isotipo: dos nodos conectados (sede ↔ persona) dentro de un cuadro redondeado. */
export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Degradado en CSS (no en <defs> de SVG): un id repetido en un nodo oculto deja el logo sin relleno. */}
      <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent" aria-hidden>
        <svg viewBox="0 0 32 32" className="size-7">
          <path d="M10 22V10l12 12V10" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {withWordmark && <span className="text-[15px] font-semibold tracking-tight text-fg">Nexora</span>}
    </span>
  );
}
