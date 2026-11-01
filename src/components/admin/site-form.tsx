"use client";

import { Crosshair } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/server/errors";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Values = Record<string, string | undefined>;
const DAYS = [
  [1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [7, "Dom"],
] as const;

export function SiteForm({ action, values, days: initialDays, submitLabel }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values: Values; days?: number[]; submitLabel: string }) {
  const [state, formAction] = useActionState(action, null);
  const v = state?.ok === false && state.data ? { ...values, ...state.data } : values;
  const err = state?.fieldErrors ?? {};
  const [lat, setLat] = useState(v.latitude ?? "");
  const [lng, setLng] = useState(v.longitude ?? "");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const days = new Set(initialDays ?? [1, 2, 3, 4, 5, 6]);

  const F = (name: string, label: string, props: React.ComponentProps<"input"> = {}, hint?: string) => (
    <Field id={name} label={label} error={err[name]} hint={hint}>
      <Input id={name} name={name} defaultValue={v[name]} aria-invalid={!!err[name] || undefined} {...props} />
    </Field>
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid gap-4 sm:grid-cols-2">
        {F("name", "Nombre de la sede", { required: true })}
        {F("city", "Ciudad", { required: true })}
        <div className="sm:col-span-2">{F("address", "Dirección", { required: true })}</div>
      </div>

      <fieldset className="grid gap-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium">Ubicación para validar la asistencia</legend>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="justify-self-start"
          loading={locating}
          onClick={() => {
            setGeoError(null);
            setLocating(true);
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setLat(p.coords.latitude.toFixed(6));
                setLng(p.coords.longitude.toFixed(6));
                setLocating(false);
              },
              () => {
                setGeoError("No se pudo obtener tu ubicación. Revisa el permiso del navegador.");
                setLocating(false);
              },
              { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
            );
          }}
        >
          <Crosshair /> Usar mi ubicación actual
        </Button>
        {geoError && <p className="text-xs text-danger">{geoError}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="latitude" label="Latitud" error={err.latitude}>
            <Input id="latitude" name="latitude" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" aria-invalid={!!err.latitude || undefined} />
          </Field>
          <Field id="longitude" label="Longitud" error={err.longitude}>
            <Input id="longitude" name="longitude" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" aria-invalid={!!err.longitude || undefined} />
          </Field>
          {F("radiusMeters", "Radio permitido (m)", { inputMode: "numeric" })}
        </div>
        <p className="text-xs text-fg-subtle">Párate en la entrada de la sede para usar tu ubicación. 80 m funciona bien en la mayoría de sedes.</p>
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium">Horario de funcionamiento</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(([n, label]) => (
            <label key={n} className="cursor-pointer">
              <input type="checkbox" name="days" value={n} defaultChecked={days.has(n)} className="peer sr-only" />
              <span className={cn("inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-fg-muted transition-colors", "peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:ring-4 peer-focus-visible:ring-ring")}>
                {label}
              </span>
            </label>
          ))}
        </div>
        {err.days && <p className="text-xs text-danger" role="alert">{err.days}</p>}
        <div className="grid max-w-sm grid-cols-2 gap-3">
          {F("opens", "Abre", { type: "time" })}
          {F("closes", "Cierra", { type: "time" }, "Si cierra antes de abrir, es al día siguiente.")}
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
