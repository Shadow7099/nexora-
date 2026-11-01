import { describe, expect, it } from "vitest";
import { distanceMeters, evaluateLocation } from "@/lib/geo";

// Sede demo "Villavicencio Centro"
const site = { lat: 4.142, lng: -73.6266, radiusMeters: 80 };
// Desplaza hacia el norte: 1° de latitud ≈ 111 195 m
const north = (m: number) => ({ lat: site.lat + m / 111_195, lng: site.lng });

describe("distanceMeters", () => {
  it("es cero en el mismo punto y ~111 km por grado de latitud", () => {
    expect(distanceMeters(site, site)).toBe(0);
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });
  it("Villavicencio Centro → Acacías ≈ 26 km", () => {
    const d = distanceMeters(site, { lat: 3.9878, lng: -73.7577 });
    expect(d).toBeGreaterThan(20_000);
    expect(d).toBeLessThan(30_000);
  });
});

describe("evaluateLocation", () => {
  it("dentro del radio: aceptada", () => {
    expect(evaluateLocation({ ...north(30), accuracy: 15 }, site, 100)).toEqual({ ok: true, status: "INSIDE", flagged: false, distance: 30 });
  });
  it("fuera del radio pero dentro de la incertidumbre del GPS: aceptada para revisar", () => {
    expect(evaluateLocation({ ...north(110), accuracy: 40 }, site, 100)).toMatchObject({ ok: true, flagged: true, distance: 110 });
  });
  it("claramente fuera: rechazada", () => {
    expect(evaluateLocation({ ...north(500), accuracy: 20 }, site, 100)).toMatchObject({ ok: false, status: "OUTSIDE", distance: 500 });
  });
  it("precisión peor que el máximo de la empresa: rechazada aunque parezca dentro", () => {
    expect(evaluateLocation({ ...north(10), accuracy: 350 }, site, 100)).toMatchObject({ ok: false, status: "LOW_ACCURACY" });
  });
  it("sin ubicación o coordenadas inválidas: rechazada", () => {
    expect(evaluateLocation(null, site, 100)).toMatchObject({ ok: false, status: "UNAVAILABLE" });
    expect(evaluateLocation({ lat: 200, lng: 0, accuracy: 5 }, site, 100)).toMatchObject({ ok: false, status: "UNAVAILABLE" });
    expect(evaluateLocation({ lat: NaN, lng: 0, accuracy: 5 }, site, 100)).toMatchObject({ ok: false, status: "UNAVAILABLE" });
  });
});
