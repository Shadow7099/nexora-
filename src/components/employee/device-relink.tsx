"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { relinkDeviceAction, relinkOptionsAction } from "@/app/m/actions";
import { Button } from "@/components/ui/button";

/**
 * El navegador olvidó este celular (cookies borradas, otra app o el ícono de la
 * pantalla de inicio en iPhone), pero el empleado ya tiene huella registrada:
 * la confirma y el celular queda reconocido de nuevo, sin aprobación del admin.
 */
export function DeviceRelink({ onFallback }: { onFallback?: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      <Button
        size="lg"
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              const options = await relinkOptionsAction();
              if (!options) return setError("Este celular no tiene una huella registrada para recuperar.");
              const r = await relinkDeviceAction(await startAuthentication({ optionsJSON: options }));
              if (!r.ok) return setError(r.message);
              router.refresh();
            } catch {
              setError("Se canceló o tu celular no confirmó la huella.");
            }
          })
        }
      >
        <Fingerprint aria-hidden /> Reconocer este celular con mi huella
      </Button>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {onFallback}
    </div>
  );
}
