/** Inventario en el navegador: lista con datos de la demo, crear producto, entrada, traslado, salida sin stock, filtros. */
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

test("inventario: crear producto, entrada, traslado y salida sin stock suficiente", async ({ page }, info) => {
  await login(page, "admin@eltrigal.test");
  await page.goto("/admin/inventario");
  await expect(page.getByRole("heading", { level: 1, name: "Inventario" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pan tajado", exact: true })).toBeVisible(); // demo
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-inventario.png`, fullPage: true });

  // Filtro: solo en o bajo el mínimo (Pan tajado: 85 en total, mínimo 20 → no aparece).
  await page.getByLabel("Solo en o bajo el mínimo").check();
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/bajo=1/);
  await expect(page.getByRole("link", { name: "Pan tajado", exact: true })).toHaveCount(0);

  // Nuevo producto (código distinto por proyecto: la base es compartida).
  const sku = info.project.name === "escritorio" ? "GAL-AVE-E" : "GAL-AVE-C";
  await page.goto("/admin/inventario/nuevo");
  await page.getByRole("button", { name: "Crear producto" }).click();
  await expect(page.getByText("Escribe el nombre.")).toBeVisible();
  await page.getByLabel("Código (SKU)").fill(sku.toLowerCase());
  await page.getByLabel("Nombre").fill("Galletas de avena");
  await page.getByLabel("Categoría (opcional)").fill("Galletería");
  await page.getByLabel("Precio de venta (COP)").fill("3500");
  await page.getByLabel("IVA").selectOption("19");
  await page.getByLabel("Stock mínimo (opcional)").fill("5");
  await page.getByRole("button", { name: "Crear producto" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Galletas de avena" })).toBeVisible();
  await expect(page.getByText("Producto creado.")).toBeVisible();
  await expect(page.getByText(sku).first()).toBeVisible(); // código en mayúsculas

  // Entrada de 20 con costo en Centro.
  await page.getByLabel("Sede", { exact: true }).selectOption({ label: "Villavicencio Centro (hay 0)" });
  await page.getByLabel("Cantidad", { exact: true }).fill("20");
  await page.getByLabel("Costo unitario (opcional)").last().fill("1500");
  await page.getByLabel("Motivo").fill("Compra a proveedor");
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  await expect(page.getByText("Stock en la sede: 0 → 20.")).toBeVisible();

  // Traslado de 8 a Acacías.
  await page.getByLabel("Movimiento", { exact: true }).selectOption("TRANSFER");
  await page.getByLabel("Sede de origen").selectOption({ label: "Villavicencio Centro (hay 20)" });
  await page.getByLabel("Sede de destino").selectOption({ label: "Acacías" });
  await page.getByLabel("Cantidad", { exact: true }).fill("8");
  await page.getByLabel("Motivo").fill("Surtir Acacías");
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  await expect(page.getByText("Stock en la sede: 20 → 12.")).toBeVisible();

  // Salida mayor que lo disponible en Acacías: rechazada.
  await page.getByLabel("Movimiento", { exact: true }).selectOption("OUT");
  await page.getByLabel("Sede", { exact: true }).selectOption({ label: "Acacías (hay 8)" });
  await page.getByLabel("Cantidad", { exact: true }).fill("9");
  await page.getByLabel("Motivo").fill("Producto dañado");
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Solo hay 8 en Acacías" }).first()).toBeVisible();
  // Con el error se conserva lo escrito (tipo, sede y cantidad).
  await expect(page.getByLabel("Movimiento", { exact: true })).toHaveValue("OUT");
  await expect(page.getByLabel("Cantidad", { exact: true })).toHaveValue("9");

  const stock = page.getByRole("heading", { name: "Stock por sede" }).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await expect(stock.getByText("20 unidad")).toBeVisible(); // total
  await expect(page.getByText("Surtir Acacías").first()).toBeVisible(); // historial
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-inventario-producto.png`, fullPage: true });
});

test("un empleado no entra al inventario", async ({ page }) => {
  await login(page, "juan@eltrigal.test");
  await page.goto("/admin/inventario");
  expect(new URL(page.url()).pathname).not.toBe("/admin/inventario");
});
