import { describe, expect, it } from "vitest";
import { qrPath } from "@/components/employee/qr-scanner";

describe("lectura del QR de la sede", () => {
  it("acepta solo enlaces de marcación de Nexora y devuelve la ruta interna", () => {
    expect(qrPath("https://nexora-tau-liard.vercel.app/m/AbC_12-xyZ09")).toBe("/m/AbC_12-xyZ09");
    expect(qrPath("  https://otro-dominio.co/m/AbC_12-xyZ09/  ")).toBe("/m/AbC_12-xyZ09");
    expect(qrPath("https://x.co/m/AbC_12-xyZ09?utm=1")).toBe("/m/AbC_12-xyZ09");
  });
  it("rechaza otros códigos", () => {
    for (const t of ["hola", "https://x.co/admin", "https://x.co/m/", "https://x.co/m/a/b", "javascript:alert(1)//m/abcdefgh", "https://x.co/m/abc", "https://x.co/m/<script>"]) {
      expect(qrPath(t), t).toBeNull();
    }
  });
});
