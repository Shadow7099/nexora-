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

/** Código de acceso del empleado, para copiarlo o enviarlo por WhatsApp. */
export function ActivationCode({ code, phone, name }: { code: string; phone?: string; name?: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "/ingresar" : `${window.location.origin}/ingresar`;
  const text = `Hola${name ? ` ${name}` : ""}, este es tu código para entrar a Nexora y marcar: ${code}. Abre ${url} en tu celular y escríbelo. Es personal: no lo compartas.`;
  const wa = waNumber(phone);
  return (
    <div role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 animate-fade-up">
      <div className="flex items-center gap-2 text-sm font-medium text-success">
        <Smartphone className="size-4" aria-hidden /> Código de acceso
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="tabular flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xl tracking-widest text-fg" data-testid="access-code">
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
        El empleado abre <strong>/ingresar</strong> en su celular y escribe este código: no necesita correo ni contraseña. Es permanente; si lo usa en otro celular, ese reemplaza al anterior. Puedes verlo o cambiarlo en su ficha.
      </p>
    </div>
  );
}
