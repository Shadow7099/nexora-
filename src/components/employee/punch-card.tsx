import { CheckCircle2, Clock, LogIn, LogOut, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PunchState =
  | { kind: "pending-in" }
  | { kind: "working"; since: string }
  | { kind: "done"; inAt: string; outAt: string; worked: string };

/**
 * Pantalla principal del empleado: saludo, sede, horario y un solo botón grande.
 * `action` es el botón real (formulario/acción de servidor), inyectado por la página.
 */
export function PunchCard({
  greeting,
  firstName,
  siteName,
  schedule,
  state,
  action,
  confirmation,
}: {
  greeting: string;
  firstName: string;
  siteName: string;
  schedule: string;
  state: PunchState;
  action?: React.ReactNode;
  confirmation?: { label: string; time: string };
}) {
  const status =
    state.kind === "pending-in"
      ? { tone: "warning" as const, text: "Pendiente de entrada" }
      : state.kind === "working"
        ? { tone: "success" as const, text: `En jornada desde ${state.since}` }
        : { tone: "neutral" as const, text: "Jornada finalizada" };

  return (
    <section className="animate-fade-up">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-fg">
        {greeting}, {firstName}.
      </h1>

      <dl className="mt-6 grid gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <MapPin className="size-5 text-primary" aria-hidden />
          <div>
            <dt className="text-xs text-fg-subtle">Tu sede</dt>
            <dd className="text-[15px] font-medium text-fg">{siteName}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <Clock className="size-5 text-accent" aria-hidden />
          <div>
            <dt className="text-xs text-fg-subtle">Tu horario de hoy</dt>
            <dd className="tabular text-[15px] font-medium text-fg">{schedule}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-4">
        <Badge tone={status.tone} dot>
          {status.text}
        </Badge>
      </div>

      <div className="mt-8">
        {confirmation ? (
          <div role="status" className="flex flex-col items-center rounded-2xl border border-success/30 bg-success-soft px-6 py-8 text-center">
            <CheckCircle2 className="size-12 animate-pop text-success" aria-hidden />
            <p className="mt-3 text-base font-semibold text-fg">{confirmation.label}</p>
            <p className="tabular mt-1 text-3xl font-semibold tracking-tight text-fg">{confirmation.time}</p>
          </div>
        ) : state.kind === "done" ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
            <p className="text-sm text-fg-muted">
              Entrada {state.inAt} · Salida {state.outAt}
            </p>
            <p className="tabular mt-2 text-2xl font-semibold text-fg">{state.worked}</p>
            <p className="mt-1 text-xs text-fg-subtle">trabajadas hoy</p>
          </div>
        ) : (
          action
        )}
      </div>
    </section>
  );
}

/** Botón gigante de marcación. Se usa dentro de un <form> con acción de servidor. */
export function PunchButton({ kind, className, ...props }: { kind: "in" | "out" } & React.ComponentProps<"button">) {
  const Icon = kind === "in" ? LogIn : LogOut;
  return (
    <button
      className={cn(
        "flex h-20 w-full items-center justify-center gap-3 rounded-2xl text-lg font-semibold shadow-pop transition-transform duration-150 active:scale-[0.98] disabled:opacity-60",
        kind === "in" ? "bg-gradient-to-br from-primary to-accent text-white" : "border border-border bg-surface text-fg",
        className,
      )}
      {...props}
    >
      <Icon className="size-6" aria-hidden />
      {kind === "in" ? "Registrar entrada" : "Registrar salida"}
    </button>
  );
}
