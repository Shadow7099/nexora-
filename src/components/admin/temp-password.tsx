"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Muestra una contraseña temporal una sola vez, con botón para copiarla. */
export function TempPassword({ password, email }: { password: string; email?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 animate-fade-up">
      <div className="flex items-center gap-2 text-sm font-medium text-success">
        <KeyRound className="size-4" aria-hidden /> Contraseña temporal
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="tabular flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-lg tracking-wider text-fg" data-testid="temp-password">
          {password}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Copiar contraseña"
          onClick={async () => {
            await navigator.clipboard?.writeText(password);
            setCopied(true);
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <p className="mt-3 text-xs text-fg-muted">
        Entrégasela al empleado{email ? ` (${email})` : ""} por un canal privado. No se volverá a mostrar: al ingresar, deberá crear su propia contraseña.
      </p>
    </div>
  );
}
