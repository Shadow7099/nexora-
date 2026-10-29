import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-border bg-surface pr-9 pl-3 text-sm text-fg shadow-card transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring aria-invalid:border-danger disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
}
