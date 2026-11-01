"use client";

import { Crosshair } from "lucide-react";
import { useActionState, useState } from "react";
import { updateSiteLocationAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/** Ajusta la ubicación de la sede: con el GPS de quien está parado en la sede, o a mano. */
export function SiteLocationForm({ siteId, latitude, longitude, radiusMeters }: { siteId: string; latitude: number; longitude: number; radiusMeters: number }) {
  const [state, action] = useActionState(updateSiteLocationAction.bind(null, siteId), null);
  const [lat, setLat] = useState(String(latitude));
  const [lng, setLng] = useState(String(longitude));
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  return (
    <details className="mt-3 rounded-lg border border-border px-3 py-2 text-sm">
      <summary className="cursor-pointer text-primary">Ajustar ubicación y radio</summary>
      <form action={action} className="mt-3 grid gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
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
        <div className="grid grid-cols-3 gap-2">
          <label className="grid gap-1 text-xs text-fg-muted">Latitud<Input name="latitude" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" /></label>
          <label className="grid gap-1 text-xs text-fg-muted">Longitud<Input name="longitude" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" /></label>
          <label className="grid gap-1 text-xs text-fg-muted">Radio (m)<Input name="radiusMeters" defaultValue={radiusMeters} inputMode="numeric" /></label>
        </div>
        <p className="text-xs text-fg-subtle">Párate en la entrada de la sede para usar tu ubicación. El cambio queda en la auditoría.</p>
        <FormAlert message={state?.message ?? state?.fieldErrors?.radiusMeters} tone={state?.ok ? "success" : "danger"} />
        <SubmitButton size="sm">Guardar ubicación</SubmitButton>
      </form>
    </details>
  );
}
