/** Ventas en el navegador: armar la venta con buscador, cliente nuevo, totales en vivo, comprobante PDF, efecto en caja e inventario, anular. */
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

test("venta completa: buscar, cantidades, cliente nuevo, comprobante, caja e inventario; luego anular", async ({ page }, info) => {
  await login(page, "admin@eltrigal.test");
  // Cada proyecto vende en su sede (la base es compartida).
  const site = info.project.name === "escritorio" ? "Villavicencio Primavera" : "Acacías";
  const stockBefore = info.project.name === "escritorio" ? 35 : 30; // almojábanas de la demo

  await page.goto("/admin/ventas/nueva");
  await expect(page.getByRole("heading", { level: 1, name: "Nueva venta" })).toBeVisible();
  await page.getByLabel("Sede").selectOption({ label: site });
  await expect(page.getByRole("button", { name: "Registrar venta" })).toBeDisabled();

  await page.getByLabel("Agregar producto").fill("almoj");
  await page.getByRole("option", { name: /Almojábana/ }).click();
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("button", { name: "Más" }).click(); // 3 × 2.500
  await page.getByLabel("Agregar producto").fill("café");
  await page.getByLabel("Agregar producto").press("Enter"); // agrega el primero encontrado
  await expect(page.getByTestId("sale-total")).toHaveText("$ 9.500");

  // Más de lo que hay: se marca y no deja registrar.
  const qty = page.getByRole("listitem").filter({ hasText: "Almojábana" }).getByLabel("Cantidad");
  await qty.fill(String(stockBefore + 1));
  await expect(page.getByText("No hay suficiente en esta sede.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar venta" })).toBeDisabled();
  await qty.fill("3");

  await page.getByText("Nuevo", { exact: true }).click();
  await page.getByLabel("Nombre o razón social").fill(`Cliente E2E ${info.project.name}`);
  await page.getByLabel("Documento (opcional)").fill(info.project.name === "escritorio" ? "900100" : "900200");
  await page.getByLabel("Medio de pago").selectOption("TRANSFER");
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-venta-nueva.png`, fullPage: true });
  await page.getByRole("button", { name: "Registrar venta" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /^Venta V-\d{6}$/ })).toBeVisible();
  await expect(page.getByText("Venta registrada.")).toBeVisible();
  await expect(page.getByText(`Cliente E2E ${info.project.name}`)).toBeVisible();
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Comprobante (PDF)" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/^nexora-venta-V-\d{6}\.pdf$/);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-venta.png`, fullPage: true });
  const saleUrl = page.url();

  // La caja de hoy de esa sede tiene el ingreso; el inventario bajó.
  await page.goto("/admin/caja");
  await page.getByRole("combobox", { name: "Sede", exact: true }).selectOption({ label: site });
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(page.getByText(/V-\d{6} · Cliente E2E/)).toBeVisible();
  await page.goto("/admin/inventario?q=almoj");
  await page.getByRole("link", { name: "Almojábana" }).first().click();
  await expect(page.getByRole("listitem").filter({ hasText: site })).toContainText(`${stockBefore - 3} unidad`);

  // Anular: vuelve el stock.
  await page.goto(saleUrl);
  await page.getByRole("button", { name: "Anular venta" }).click();
  await page.getByLabel("Motivo de la anulación").fill("Prueba de anulación");
  await page.getByRole("button", { name: "Confirmar anulación" }).click();
  await expect(page.getByText(/Anulada el .* por .*: Prueba de anulación/)).toBeVisible();
  await page.goto("/admin/ventas");
  await expect(page.getByText("Anulada").first()).toBeVisible();
});
