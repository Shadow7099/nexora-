"use client";

import jsQR from "jsqr";
import { Camera, LogIn, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Acepta solo QR de Nexora (…/m/<código>) y devuelve la ruta interna. Se ignora
 * el dominio del QR: la marcación siempre se abre en este mismo sitio, donde el
 * empleado ya tiene la sesión y el celular vinculado.
 */
export function qrPath(text: string): string | null {
  try {
    const u = new URL(text.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const m = /^\/m\/([A-Za-z0-9_-]{6,64})\/?$/.exec(u.pathname);
    return m ? `/m/${m[1]}` : null;
  } catch {
    return null;
  }
}

type Status = { kind: "idle" } | { kind: "starting" } | { kind: "scanning" } | { kind: "found" } | { kind: "error"; message: string };

/** Botón «Marcar entrada/salida»: abre la cámara dentro de Nexora y lee el QR de la sede. */
export function QrScanButton({ working }: { working: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = working ? "Marcar salida" : "Marcar entrada";

  const stop = useCallback(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const close = useCallback(() => {
    stop();
    setOpen(false);
    setStatus({ kind: "idle" });
    buttonRef.current?.focus();
  }, [stop]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let misses = 0;

    const tick = () => {
      const video = videoRef.current;
      if (cancelled || !video || !ctx) return;
      if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        // Se reduce la imagen: más rápido y suficiente para un QR de entrada.
        const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          const path = qrPath(code.data);
          if (path) {
            setStatus({ kind: "found" });
            stop();
            router.push(path);
            return;
          }
          if (++misses % 30 === 1) setStatus({ kind: "error", message: "Ese código no es el QR de una sede de Nexora. Apunta al QR pegado en la entrada." });
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    (async () => {
      setStatus({ kind: "starting" });
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus({ kind: "error", message: "Este navegador no permite usar la cámara. Ábrelo en Chrome o Safari, o escanea el QR con la cámara del celular." });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play().catch(() => {});
        setStatus({ kind: "scanning" });
        frameRef.current = requestAnimationFrame(tick);
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        console.error("cámara:", name, e instanceof Error ? e.message : e);
        setStatus({
          kind: "error",
          message:
            name === "NotAllowedError" || name === "SecurityError"
              ? "No diste permiso para usar la cámara. Actívalo en la configuración del navegador (permisos del sitio → Cámara) y vuelve a intentarlo."
              : name === "NotFoundError" || name === "OverconstrainedError"
                ? "No encontramos una cámara en este dispositivo. Marca desde tu celular."
                : "No se pudo abrir la cámara. Cierra otras apps que la estén usando y vuelve a intentarlo.",
        });
      }
    })();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, [open, router, stop, close]);

  return (
    <>
      <Button ref={buttonRef} size="lg" className="h-14 w-full text-base" onClick={() => setOpen(true)}>
        {working ? <LogOut aria-hidden /> : <LogIn aria-hidden />} {label}
      </Button>
      <p className="mt-2 text-center text-xs text-fg-muted">Se abre la cámara: apunta al QR pegado en la entrada de la sede.</p>

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`${label}: escanear el QR de la sede`} className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium"><Camera className="size-4" aria-hidden /> Escanea el QR de la sede</p>
            <button type="button" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-white/15" aria-label="Cerrar la cámara">
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" aria-hidden />
            <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="size-64 max-w-[75vw] rounded-3xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
          <div className="px-5 py-4 text-center text-sm" aria-live="polite">
            {status.kind === "starting" && <p>Abriendo la cámara…</p>}
            {status.kind === "scanning" && <p>Apunta al código QR. Se lee solo.</p>}
            {status.kind === "found" && <p>QR leído. Abriendo la marcación…</p>}
            {status.kind === "error" && (
              <div className="grid gap-3">
                <p role="alert" className="rounded-lg bg-white/10 px-3 py-2">{status.message}</p>
                <Button variant="secondary" onClick={close}>Cerrar</Button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
