"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { AlertCircle, CheckCircle2, Fingerprint, Loader2, MapPin, RotateCcw, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { bindDeviceAction, punchAction, punchPasskeyOptionsAction, type PunchActionResult } from "@/app/m/actions";
import { DeviceRelink } from "@/components/employee/device-relink";
import { PasskeySetup } from "@/components/employee/passkey-setup";
import { PunchButton } from "@/components/employee/punch-card";
import { Button } from "@/components/ui/button";
import { formatMinutes, formatTime } from "@/lib/utils";

type Props = {
  publicCode: string;
  next: "IN" | "OUT";
  timezone: string;
  requireDevice: boolean;
  device: { status: "PENDING" | "ACTIVE" | "REVOKED"; label: string } | null;
  passkeyRequired: boolean;
  /** Ya tiene un celular con huella: puede reconocerlo con la huella en vez de vincular uno nuevo. */
  canRelink?: boolean;
  /** Ya hay un celular activo que este navegador no recuerda. */
  hasOtherDevice?: boolean;
  /** La empresa exige huella o Face ID y este celular aún no la tiene. */
  needsPasskeySetup?: boolean;
};

type Step = "idle" | "locating" | "verifying" | "saving";

/** Ubicación del celular SOLO en este momento (sin seguimiento). Devuelve null si se niega o falla. */
function currentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

const stepText: Record<Exclude<Step, "idle">, { icon: typeof MapPin; text: string }> = {
  locating: { icon: MapPin, text: "Verificando que estás en la sede…" },
  verifying: { icon: Fingerprint, text: "Confirma con tu huella o Face ID…" },
  saving: { icon: Loader2, text: "Registrando…" },
};

export function PunchPanel({ publicCode, next, timezone, requireDevice, device, passkeyRequired, canRelink = false, hasOtherDevice = false, needsPasskeySetup = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<PunchActionResult | null>(null);
  const [binding, startBinding] = useTransition();
  // Una clave por intento: si la red reintenta, el servidor no duplica la marcación.
  const keyRef = useRef<string | null>(null);

  if (requireDevice && !device && canRelink) {
    return (
      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 size-5 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Confirma que es tu celular</p>
            <p className="mt-1 text-sm text-fg-muted">Este navegador no recuerda tu celular. Confírmalo con tu huella o Face ID y sigue marcando normalmente. Solo se pide una vez en esta ventana.</p>
          </div>
        </div>
        <DeviceRelink
          onFallback={
            <Button variant="ghost" loading={binding} onClick={() => startBinding(async () => { await bindDeviceAction(); router.refresh(); })}>
              Es un celular nuevo (requiere aprobación)
            </Button>
          }
        />
      </div>
    );
  }
  if (requireDevice && !device) {
    return (
      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-5 text-primary" aria-hidden />
          <div>
            {hasOtherDevice ? (
              <>
                <p className="font-medium">Esta ventana no reconoce tu celular</p>
                <p className="mt-1 text-sm text-fg-muted">
                  Si abriste el QR con la cámara del celular, se abrió una ventana aparte que no recuerda tu celular ya vinculado. Abre Nexora en tu
                  navegador (Safari o Chrome), donde ya ingresaste, y toca <strong className="font-medium text-fg">Marcar entrada</strong>: la cámara se abre ahí mismo.
                </p>
                <p className="mt-2 text-sm text-fg-muted">¿Cambiaste de celular? Vincúlalo aquí y tu administrador lo aprueba.</p>
              </>
            ) : (
              <>
                <p className="font-medium">Vincula este celular</p>
                <p className="mt-1 text-sm text-fg-muted">Solo podrás marcar desde tu propio celular, confirmando con tu huella o Face ID. Si es tu primer celular, queda listo de inmediato.</p>
              </>
            )}
          </div>
        </div>
        <Button size="lg" variant={hasOtherDevice ? "secondary" : "primary"} loading={binding} onClick={() => startBinding(async () => { await bindDeviceAction(); router.refresh(); })}>
          {hasOtherDevice ? "Vincular como celular nuevo" : "Vincular este celular"}
        </Button>
      </div>
    );
  }
  if (requireDevice && device?.status === "PENDING") {
    return <Notice icon={Smartphone} title="Celular pendiente de aprobación" text="Tu administrador debe aprobar este celular nuevo. Cuando lo haga, podrás marcar desde aquí." />;
  }
  if (requireDevice && device?.status === "REVOKED") {
    return <Notice icon={AlertCircle} title="Este celular fue desvinculado" text="Pide ayuda a tu administrador para vincular tu celular de nuevo." />;
  }

  if (requireDevice && device?.status === "ACTIVE" && needsPasskeySetup) {
    return <PasskeySetup required />;
  }

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col items-center rounded-2xl border border-success/30 bg-success-soft px-6 py-8 text-center">
        <CheckCircle2 className="size-14 animate-pop text-success" aria-hidden />
        <p className="mt-3 text-base font-semibold text-fg">{result.type === "IN" ? "Entrada registrada" : "Salida registrada"}</p>
        <p className="tabular mt-1 text-4xl font-semibold tracking-tight text-fg" data-testid="punch-time">{formatTime(new Date(result.at), timezone)}</p>
        <p className="mt-2 text-sm text-fg-muted">{result.siteName}</p>
        {result.type === "OUT" && result.workedMinutes != null && (
          <p className="mt-1 text-sm text-fg-muted">Jornada de {formatMinutes(result.workedMinutes)}</p>
        )}
        {result.flagged && <p className="mt-3 text-xs text-warning">Quedó registrada para revisión (ubicación en el borde del área o salida en otra sede).</p>}
        {result.staleClosed && <p className="mt-3 text-xs text-warning">Tu jornada anterior no tenía salida; tu administrador la revisará.</p>}
      </div>
    );
  }

  async function onPunch() {
    setResult(null);
    keyRef.current ??= crypto.randomUUID();
    setStep("locating");
    const position = await currentPosition();
    let assertion;
    if (passkeyRequired) {
      setStep("verifying");
      try {
        const options = await punchPasskeyOptionsAction();
        if (options) assertion = await startAuthentication({ optionsJSON: options });
      } catch {
        assertion = undefined; // el servidor lo registra como intento fallido
      }
    }
    setStep("saving");
    try {
      const r = await punchAction({ publicCode, idempotencyKey: keyRef.current, position }, assertion);
      setResult(r);
      if (r.ok) router.refresh();
      else keyRef.current = null; // un rechazo permite un intento nuevo
    } catch {
      setResult({ ok: false, message: "No hay conexión. Revisa tus datos o wifi e intenta de nuevo." });
    } finally {
      setStep("idle");
    }
  }

  const busy = step !== "idle";
  const s = busy ? stepText[step] : null;
  return (
    <div className="grid gap-4">
      {result && !result.ok && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger animate-fade-up">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{result.message}</span>
        </div>
      )}
      <PunchButton kind={next === "IN" ? "in" : "out"} onClick={onPunch} disabled={busy} aria-busy={busy} />
      <p className="flex min-h-5 items-center justify-center gap-2 text-sm text-fg-muted" aria-live="polite">
        {s ? (
          <>
            <s.icon className={step === "saving" ? "size-4 animate-spin" : "size-4"} aria-hidden /> {s.text}
          </>
        ) : result && !result.ok ? (
          <>
            <RotateCcw className="size-4" aria-hidden /> Puedes intentarlo de nuevo
          </>
        ) : passkeyRequired ? (
          <>
            <Fingerprint className="size-4" aria-hidden /> Te pediremos tu huella o Face ID
          </>
        ) : (
          <>
            <MapPin className="size-4" aria-hidden /> Usaremos tu ubicación solo en este momento
          </>
        )}
      </p>
    </div>
  );
}

function Notice({ icon: Icon, title, text }: { icon: typeof MapPin; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <Icon className="mt-0.5 size-5 text-warning" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-fg-muted">{text}</p>
      </div>
    </div>
  );
}
