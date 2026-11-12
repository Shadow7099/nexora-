"use client";

import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { passkeyRegistrationOptionsAction, registerPasskeyAction } from "@/app/m/actions";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

/**
 * Activa la huella o Face ID (passkey) de este celular para confirmar cada
 * marcación. `required`: la empresa la exige y aún no se puede marcar sin ella.
 */
export function PasskeySetup({ required = false }: { required?: boolean }) {
  const router = useRouter();
  const supported = useSyncExternalStore(subscribe, () => browserSupportsWebAuthn(), () => true);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (!supported) {
    return required ? (
      <div role="alert" className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-fg">
        <p className="font-medium">Este navegador no permite usar huella ni Face ID</p>
        <p className="mt-1 text-fg-muted">Abre Nexora en Safari (iPhone) o Chrome (Android). Si tu celular no tiene huella ni Face ID, pide a tu administrador que autorice este celular.</p>
      </div>
    ) : null;
  }
  if (done) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
        <CheckCircle2 className="size-4" aria-hidden /> Huella o Face ID activado. Te lo pediremos al marcar.
      </p>
    );
  }
  return (
    <div className={required ? "rounded-2xl border border-primary/40 bg-surface p-5 shadow-card" : "rounded-2xl border border-border bg-surface p-4 shadow-card"}>
      <div className="flex items-start gap-3">
        <Fingerprint className="mt-0.5 size-5 text-accent" aria-hidden />
        <div className="flex-1">
          <p className={required ? "font-medium" : "text-sm font-medium"}>{required ? "Activa tu huella o Face ID para marcar" : "Protege tus marcaciones con tu huella o Face ID"}</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {required ? "Tu empresa pide confirmar cada marcación con tu huella o Face ID. Solo se hace una vez en este celular. " : "Así nadie más puede marcar por ti, aunque tenga tu celular. "}
            Lo verifica tu celular; Nexora no recibe tu huella ni tu rostro.
          </p>
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
      <Button
        variant={required ? "primary" : "secondary"}
        size={required ? "lg" : "md"}
        className="mt-3 w-full"
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const o = await passkeyRegistrationOptionsAction();
            if (!o.ok) return setError(o.message);
            try {
              const response = await startRegistration({ optionsJSON: o.options });
              const r = await registerPasskeyAction(response);
              if (!r.ok) return setError(r.message);
              setDone(true);
              router.refresh(); // la página muestra el estado permanente "Huella o Face ID activado en este celular"
            } catch {
              setError("Se canceló o tu celular no permitió activar la huella o Face ID. Intenta de nuevo.");
            }
          })
        }
      >
        <Fingerprint /> Activar huella o Face ID
      </Button>
    </div>
  );
}
