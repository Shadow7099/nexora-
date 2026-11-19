"use client";

import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { ScanFace } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { passkeyLoginAction, passkeyLoginOptionsAction } from "../actions";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

/** Empleados: entrar con Face ID o huella, sin correo ni contraseña. */
export function PasskeyLogin({ next }: { next?: string }) {
  const supported = useSyncExternalStore(subscribe, () => browserSupportsWebAuthn(), () => true);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {supported && (
        <Button
          size="lg"
          variant="secondary"
          className="w-full"
          loading={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                const options = await passkeyLoginOptionsAction();
                const response = await startAuthentication({ optionsJSON: options });
                const r = await passkeyLoginAction(response, next);
                if (!r.ok) return setError(r.message);
                window.location.assign(r.href);
              } catch {
                setError("No se completó la verificación. Intenta de nuevo.");
              }
            })
          }
        >
          <ScanFace /> Entrar con Face ID o huella
        </Button>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
