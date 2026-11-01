/**
 * Validación de ubicación al marcar. Funciones puras (sin BD) y probadas.
 *
 * Regla (documentada en docs/ARQUITECTURA.md):
 * - Sin ubicación                          → rechazo (UNAVAILABLE)
 * - Precisión peor que el máximo de la empresa → rechazo (LOW_ACCURACY): pedir reintentar
 * - Distancia ≤ radio                       → aceptada (INSIDE)
 * - Distancia ≤ radio + precisión           → aceptada para revisar (INSIDE, flagged):
 *   el círculo de incertidumbre del GPS toca la sede, no se puede afirmar que esté fuera
 * - Más lejos                               → rechazo (OUTSIDE)
 */

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en metros entre dos puntos (fórmula de Haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type GeoInput = { lat: number; lng: number; accuracy: number } | null;
export type GeoVerdict =
  | { ok: true; status: "INSIDE"; flagged: boolean; distance: number }
  | { ok: false; status: "UNAVAILABLE" | "LOW_ACCURACY" | "OUTSIDE"; distance: number | null };

export function evaluateLocation(
  position: GeoInput,
  site: { lat: number; lng: number; radiusMeters: number },
  maxAccuracyM: number,
): GeoVerdict {
  if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng) || Math.abs(position.lat) > 90 || Math.abs(position.lng) > 180) {
    return { ok: false, status: "UNAVAILABLE", distance: null };
  }
  const distance = Math.round(distanceMeters(position, site));
  const accuracy = Math.max(0, position.accuracy);
  if (accuracy > maxAccuracyM) return { ok: false, status: "LOW_ACCURACY", distance };
  if (distance <= site.radiusMeters) return { ok: true, status: "INSIDE", flagged: false, distance };
  if (distance <= site.radiusMeters + accuracy) return { ok: true, status: "INSIDE", flagged: true, distance };
  return { ok: false, status: "OUTSIDE", distance };
}
