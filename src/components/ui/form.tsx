"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Botón de envío que muestra el estado de carga del formulario que lo contiene. */
export function SubmitButton({ children, pendingText, ...props }: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function FormAlert({ message, tone = "danger", className }: { message?: string; tone?: "danger" | "success"; className?: string }) {
  if (!message) return null;
  const Icon = tone === "danger" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 text-sm animate-fade-up",
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
