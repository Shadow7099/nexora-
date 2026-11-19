import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "@/lib/canonical-host";

const APP = "https://nexora-tau-liard.vercel.app";

describe("un solo dominio", () => {
  it("redirige otras direcciones al dominio de APP_URL conservando ruta y parámetros", () => {
    expect(canonicalRedirect("https://nexora-abc123-team.vercel.app/m/QR123?x=1", "nexora-abc123-team.vercel.app", APP)).toBe(`${APP}/m/QR123?x=1`);
    expect(canonicalRedirect("https://x.vercel.app/", "X.vercel.app", APP)).toBe(`${APP}/`);
  });
  it("no redirige el propio dominio, las rutas /api, ni sin APP_URL", () => {
    expect(canonicalRedirect(`${APP}/app`, "nexora-tau-liard.vercel.app", APP)).toBeNull();
    expect(canonicalRedirect(`${APP}/app`, "NEXORA-TAU-LIARD.vercel.app", APP)).toBeNull();
    expect(canonicalRedirect("https://otro.vercel.app/api/webhooks/meta/t", "otro.vercel.app", APP)).toBeNull();
    expect(canonicalRedirect("https://otro.vercel.app/app", "otro.vercel.app", undefined)).toBeNull();
    expect(canonicalRedirect("http://localhost:3100/app", "localhost:3100", "http://localhost:3100")).toBeNull();
  });
});
