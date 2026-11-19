"use client";

import { Check, Copy, MessageCircle, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

/** Teléfono colombiano a formato internacional para wa.me (solo dígitos). */
function waNumber(phone?: string) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  return d.length >= 11 ? d : "";
}

/** Muestra el código de activación una sola vez, para copiarlo o enviarlo por WhatsApp. */
export function ActivationCode({ code, phone, name }: { code: string; phone?: string; name?: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "/activar" : `${window.location.origin}/activar`;
  const text = `Hola${name ? ` ${name}` : ""}, activa Nexora en tu celular: abre ${url}, escribe tu cédula y este código: ${code}. Luego activa tu huella o Face ID y listo, así entrarás y marcarás.`;
  const wa = waNumber(phone);
  return (
    <div role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 animate-fade-up">
      <div className="flex items-center gap-2 text-sm font-medium text-success">
        <Smartphone className="size-4" aria-hidden /> Código de activación
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="tabular flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xl tracking-widest text-fg" data-testid="activation-code">
          {code}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Copiar mensaje con el código"
          onClick={async () => {
            await navigator.clipboard?.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <a
        href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ className: "mt-3 w-full" })}
      >
        <MessageCircle /> Enviar por WhatsApp
      </a>
      <p className="mt-3 text-xs text-fg-muted">
        El empleado abre <strong>/activar</strong> en su celular, escribe su cédula y este código, y activa su huella o Face ID. No necesita correo ni contraseña. Sirve una sola vez y vence en 7 días.
      </p>
    </div>
  );
}
