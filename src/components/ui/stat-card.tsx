import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Indicador principal. `delta` es la variación frente al período anterior;
 * `goodWhen` indica si subir es bueno (asistencia) o malo (llegadas tarde).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  goodWhen = "up",
  footnote,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: { value: string; direction: "up" | "down" };
  goodWhen?: "up" | "down";
  footnote?: string;
  className?: string;
}) {
  const positive = delta && delta.direction === goodWhen;
  return (
    <Card className={cn("p-4 animate-fade-up sm:p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="truncate text-sm text-fg-muted">{label}</p>
        <Icon className="size-4 text-fg-subtle" aria-hidden />
      </div>
      <p className="tabular mt-3 text-xl font-semibold sm:text-2xl tracking-tight text-fg">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {delta && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", positive ? "text-success" : "text-danger")}>
            {delta.direction === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {delta.value}
          </span>
        )}
        {footnote && <span className="text-fg-subtle">{footnote}</span>}
      </div>
    </Card>
  );
}
