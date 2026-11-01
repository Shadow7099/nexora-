"use client";

import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { passkeyRegistrationOptionsAction, registerPasskeyAction } from "@/app/m/actions";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

/** Activa una passkey (huella, rostro o PIN del celular) para confirmar cada marcación. */
export function PasskeySetup() {
  const router = useRouter();
  const supported = useSyncExternalStore(subscribe, () => browserSupportsWebAuthn(), () => true);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (!supported) return null;
  if (done) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
        <CheckCircle2 className="size-4" aria-hidden /> Huella activada. Te la pediremos al marcar.
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Fingerprint className="mt-0.5 size-5 text-accent" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-medium">Protege tus marcaciones con tu huella</p>
          <p className="mt-0.5 text-xs text-fg-muted">Así nadie más puede marcar por ti, aunque tenga tu celular. La huella la verifica tu celular; Nexora no la recibe.</p>
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
      <Button
        variant="secondary"
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
              router.refresh(); // la página muestra el estado permanente "Huella activada en este celular"
            } catch {
              setError("Se canceló o tu celular no permitió crear la huella.");
            }
          })
        }
      >
        <Fingerprint /> Activar huella
      </Button>
    </div>
  );
}
