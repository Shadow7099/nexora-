/** Fase 6 en el navegador: calcular la pre-nómina estimada, ver el detalle y la tabla de parámetros; validación por el superadmin. */
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
// En celular, Chrome agranda el viewport si el contenido no cabe: por eso también se compara con el ancho de la pantalla.
const noOverflow = async (page: Page) => {
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth, screen: window.screen.width }));
  expect(m.scroll - m.inner, "sin scroll horizontal").toBeLessThanOrEqual(0);
  expect(m.inner, "el viewport no se agranda").toBeLessThanOrEqual(m.screen);
};

test("el administrador calcula la pre-nómina de la quincena y revisa el detalle", async ({ page }, info) => {
  await login(page, "admin@eltrigal.test");
  // Quincena con las marcaciones simuladas de la demo (16–31 oct. 2026).
  await page.goto("/admin/pre-nomina?inicio=2026-10-16&fin=2026-10-31");
  await expect(page.getByRole("heading", { level: 1, name: "Pre-nómina" })).toBeVisible();
  await page.getByRole("button", { name: /Calcular estimación|Recalcular/ }).click();
  await expect(page.getByRole("status")).toContainText("Estimación calculada para 8 empleado(s)");
  await expect(page.getByText("Costo total para la empresa")).toBeVisible();
  await expect(page.getByRole("table").first().locator("tbody tr")).toHaveCount(8);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-pre-nomina.png`, fullPage: true });

  await page.locator("tbody").getByRole("link", { name: /Juan/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Juan/ })).toBeVisible();
  await expect(page.getByText("Salario básico", { exact: true })).toBeVisible();
  await expect(page.getByText("Parámetros usados en este cálculo")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-pre-nomina-detalle.png`, fullPage: true });

  await page.goto("/admin/pre-nomina/parametros");
  await expect(page.getByRole("heading", { level: 1, name: "Parámetros laborales" })).toBeVisible();
  await expect(page.getByText("Salario mínimo mensual (SMMLV)").first()).toBeVisible();
  await expect(page.getByText("$ 1.750.905")).toBeVisible();
  await expect(page.getByRole("button", { name: /Validar/ })).toHaveCount(0); // solo lectura
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-parametros.png`, fullPage: true });
});

test("liquidación: revisar, cerrar el período y descargar los comprobantes de pago", async ({ page }, info) => {
  await login(page, "admin@eltrigal.test");
  // Cada proyecto usa su propia quincena: la base es compartida y un período cerrado no se recalcula.
  const [start, end] = info.project.name === "escritorio" ? ["2026-09-01", "2026-09-15"] : ["2026-09-16", "2026-09-30"];
  await page.goto(`/admin/pre-nomina?inicio=${start}&fin=${end}`);
  await page.getByRole("button", { name: "Calcular estimación" }).click();
  await expect(page.getByRole("status").first()).toContainText("Estimación calculada");
  await expect(page.getByText("Liquidación del período")).toBeVisible();
  await expect(page.getByText("Planilla de seguridad social")).toBeVisible();

  // Comprobantes en borrador: PDF descargable.
  const [draft] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Comprobantes de pago \(PDF\) · borrador/ }).click()]);
  expect(draft.suggestedFilename()).toBe(`nexora-comprobantes-${start}_${end}.pdf`);

  await page.getByRole("button", { name: "Marcar como revisada" }).click();
  await expect(page.getByText("Período marcado como revisado.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recalcular" })).toHaveCount(0);

  // Cerrar exige confirmar.
  await page.getByRole("button", { name: "Cerrar período" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Marca la casilla" })).toBeVisible();
  await page.getByRole("checkbox", { name: /Confirmo que el contador/ }).check();
  await page.getByRole("button", { name: "Cerrar período" }).click();
  await expect(page.getByText(/Período cerrado el .* por /)).toBeVisible();
  await expect(page.getByRole("button", { name: /Recalcular|Cerrar período|Marcar como revisada/ })).toHaveCount(0);
  await expect(page.getByText("Historial de este período")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-liquidacion.png`, fullPage: true });

  const [final] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Comprobantes de pago (PDF)", exact: true }).click()]);
  expect(final.suggestedFilename()).toBe(`nexora-comprobantes-${start}_${end}.pdf`);

  // Comprobante de un solo empleado desde su detalle.
  await page.locator("tbody").getByRole("link", { name: /Juan/ }).first().click();
  await expect(page.getByText(/cerrada · estimación/)).toBeVisible();
  const [one] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Comprobante de pago (PDF)" }).click()]);
  expect(one.suggestedFilename()).toMatch(/^nexora-comprobantes-.*-juan-.*\.pdf$/);
});

test("un período inválido en la URL vuelve a la quincena por defecto", async ({ page }) => {
  await login(page, "admin@eltrigal.test");
  expect((await page.goto("/admin/pre-nomina?inicio=2026-10-03&fin=2026-10-20"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 3, name: /Quincena del/ })).toBeVisible();
});

test("el superadministrador valida un parámetro; el empleado no entra a la pre-nómina", async ({ page }, info) => {
  await login(page, "plataforma@nexora.test");
  await page.goto("/plataforma/parametros");
  await expect(page.getByRole("heading", { level: 1, name: "Parámetros laborales" })).toBeVisible();
  const before = await page.getByRole("button", { name: /Marcar como validado/ }).count();
  expect(before).toBeGreaterThan(0);
  // Cada proyecto (escritorio/celular) valida uno distinto: la base es compartida.
  await page.getByRole("button", { name: info.project.name === "escritorio" ? "Marcar como validado: SENA" : "Marcar como validado: ICBF" }).click();
  // La fila pasa a "Validado <fecha>" y su botón desaparece (también tras recargar).
  await expect(page.getByRole("button", { name: /Marcar como validado/ })).toHaveCount(before - 1);
  await expect(page.getByText(/^Validado \d/).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Marcar como validado/ })).toHaveCount(before - 1);
  await noOverflow(page);

  await page.goto("/ingresar");
  await page.context().clearCookies();
  await login(page, "juan@eltrigal.test");
  const res = await page.goto("/admin/pre-nomina");
  expect(new URL(page.url()).pathname).not.toBe("/admin/pre-nomina");
  expect(res?.status()).toBeLessThan(500);
});
