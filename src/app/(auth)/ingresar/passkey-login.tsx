"use client";

import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { ScanFace } from "lucide-react";
import Link from "next/link";
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
      <p className="text-center text-sm text-fg-muted">
        ¿Primera vez o celular nuevo? <Link href="/activar" className="font-medium text-primary hover:underline">Activa tu celular con tu cédula y código</Link>
      </p>
    </div>
  );
}
