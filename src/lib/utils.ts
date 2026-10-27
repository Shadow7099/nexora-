import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Zona horaria por defecto. Colombia no tiene horario de verano. */
export const DEFAULT_TZ = "America/Bogota";

export function formatTime(date: Date, timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
    .format(date)
    .replace(/\s+/g, " ");
}

export function formatDate(date: Date, timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone }).format(date);
}

/** Pesos colombianos sin decimales: $ 1.750.905 */
export function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
    .format(value)
    .replace(/\s+/g, " ");
}

/** 510 → "8 h 30 min" · 45 → "45 min" · 480 → "8 h" */
export function formatMinutes(total: number) {
  const sign = total < 0 ? "−" : "";
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} min`;
  return m === 0 ? `${sign}${h} h` : `${sign}${h} h ${m} min`;
}

/** Minutos desde medianoche → "8:00 a. m."; acepta valores > 1440 (día siguiente). */
export function minutesToClock(min: number) {
  const m = ((min % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const suffix = h24 < 12 ? "a. m." : "p. m.";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${suffix}`;
}

/** Saludo según la hora local: Buenos días / Buenas tardes / Buenas noches. */
export function greeting(date: Date, timeZone = DEFAULT_TZ) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(date)) % 24;
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
