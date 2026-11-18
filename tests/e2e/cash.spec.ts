/** Caja en el navegador: ingresos y egresos, anular con motivo, cierre con diferencia explicada y reabrir. */
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("Nexora-Demo-2026");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Autorización/);
  }
}
const noOverflow = async (page: Page) => {
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(m.scroll - m.inner, "sin scroll horizontal").toBeLessThanOrEqual(0);
};

test("caja del día: registrar, anular, cerrar con diferencia y reabrir", async ({ page }, info) => {
  await login(page, "admin@eltrigal.test");
  await page.goto("/admin/caja");
  await expect(page.getByRole("heading", { level: 1, name: "Caja" })).toBeVisible();
  // Cada proyecto usa su sede (la base es compartida).
  const site = info.project.name === "escritorio" ? "Villavicencio Centro" : "Restrepo";
  await page.getByRole("combobox", { name: "Sede", exact: true }).selectOption({ label: site });
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(`${site} · hoy`) })).toBeVisible();

  const register = async (type: "Ingreso" | "Egreso", amount: string, method: string, category: string) => {
    await page.getByText(type, { exact: true }).click();
    await page.getByLabel("Valor (COP)").fill(amount);
    await page.getByLabel("Medio de pago").selectOption({ label: method });
    await page.getByLabel("Categoría").fill(category);
    await page.getByRole("button", { name: `Registrar ${type.toLowerCase()}` }).click();
    await expect(page.getByText(`${type} registrado.`)).toBeVisible();
  };
  await page.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(page.getByText("Debe ser mayor que cero.").or(page.getByText("Valor inválido."))).toBeVisible();
  await register("Ingreso", "100000", "Efectivo", "Ventas");
  await register("Ingreso", "50000", "Transferencia", "Ventas");
  await register("Egreso", "20000", "Efectivo", "Compras");
  await register("Egreso", "7000", "Efectivo", "Transporte");

  // Anular el transporte (con motivo): queda tachado y sale de los totales.
  const row = page.getByRole("listitem").filter({ hasText: "Transporte" });
  await row.getByRole("button", { name: "Anular" }).click();
  await row.getByLabel("Motivo de la anulación").fill("Se registró por error");
  await row.getByRole("button", { name: "Confirmar anulación" }).click();
  await expect(page.getByText(/Anulado por .*: Se registró por error/)).toBeVisible();
  await expect(page.getByText("$ 80.000").first()).toBeVisible(); // esperado: 100.000 − 20.000

  // Cierre: contados 79.000 → falta explicar la diferencia.
  await page.getByLabel("Efectivo contado en caja").fill("79000");
  await expect(page.getByText("Faltan $ 1.000.")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar el día" }).click();
  await expect(page.getByText(/La caja no cuadra \(faltan \$ 1\.000\)/)).toBeVisible();
  await page.getByLabel("Explica la diferencia").fill("Vueltas mal entregadas");
  await page.getByRole("button", { name: "Cerrar el día" }).click();
  await expect(page.getByText("El día está cerrado.")).toBeVisible();
  await expect(page.getByText("Faltante $ 1.000").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Anular" })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-caja.png`, fullPage: true });

  // Reabrir con motivo: vuelve a estar abierto.
  await page.getByLabel("Motivo para reabrir").fill("Faltó registrar un gasto");
  await page.getByRole("button", { name: "Reabrir el día" }).click();
  await expect(page.getByRole("button", { name: "Registrar ingreso" })).toBeVisible();
  await expect(page.getByText("Reabierto: Faltó registrar un gasto")).toBeVisible();
});
