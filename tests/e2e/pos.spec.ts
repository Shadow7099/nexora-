/**
 * Punto de venta visual (tienda de hilos): Categoría → Tipo → Producto →
 * Gramaje → Color con cuadros grandes; agregar, cobrar en efectivo con devuelta.
 */
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.POS_SHOTS_DIR;
const shot = async (page: Page, name: string, tag: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-${name}.png` }); };

async function login(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill("admin@eltrigal.test");
  await page.getByLabel("Contraseña").fill("Nexora-Demo-2026");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  }
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("vender hilo con cuadros grandes: categoría, tipo, producto, gramaje, color y cobrar con devuelta", async ({ page }, info) => {
  test.setTimeout(90_000);
  const tag = info.project.name;
  await login(page);
  // Catálogo de ejemplo (si ya lo cargó el otro recorrido, sigue).
  await page.goto("/admin/pos/catalogo");
  const loader = page.getByRole("button", { name: "Cargar la tienda de hilos de ejemplo" });
  await expect(loader.or(page.getByText(/Hilos de crochet · \d+ variantes/))).toBeVisible({ timeout: 60_000 });
  if (await loader.isVisible()) {
    await loader.click();
    // Al cargarse, la tarjeta de carga desaparece y aparecen las categorías.
    await expect(page.getByText(/Hilos de crochet · \d+ variantes|ya está cargado/)).toBeVisible({ timeout: 60_000 });
  }

  await page.goto("/admin/pos");
  await expect(page.getByRole("heading", { name: "¿Qué busca el cliente?" })).toBeVisible();
  await shot(page, "1-categorias", tag);
  await page.getByRole("button", { name: /^Hilos/ }).first().click();
  await expect(page.getByRole("heading", { name: "Elija el tipo" })).toBeVisible();
  await page.getByRole("button", { name: /Hilos de crochet/ }).click();
  await expect(page.getByRole("heading", { name: "Elija el producto" })).toBeVisible();
  await shot(page, "2-productos", tag);
  await page.getByRole("button", { name: /Algodón mercerizado/ }).click();
  await expect(page.getByRole("heading", { name: "Elija el gramaje o tamaño" })).toBeVisible();
  await shot(page, "3-gramajes", tag);
  await page.getByRole("button", { name: /^50 g/ }).click();
  await expect(page.getByRole("heading", { name: "Toque el color para agregarlo" })).toBeVisible();
  await page.getByRole("button", { name: /^Algodón mercerizado 50 g Rojo,/ }).click();
  await expect(page.getByText("✓ Agregado: Algodón mercerizado 50 g Rojo")).toBeVisible();
  await page.getByRole("button", { name: /^Algodón mercerizado 50 g Rojo,/ }).click();
  await page.getByRole("button", { name: /^Algodón mercerizado 50 g Azul rey,/ }).click();
  await shot(page, "4-colores", tag);

  // Atrás vuelve al paso anterior.
  await page.getByRole("button", { name: "Atrás" }).click();
  await expect(page.getByRole("heading", { name: "Elija el gramaje o tamaño" })).toBeVisible();

  // Venta: 3 unidades de $6.500 = $19.500.
  if (tag === "celular") await page.getByRole("button", { name: /3 en la venta/ }).click();
  const venta = page.getByRole("complementary", { name: "Venta actual" });
  await expect(venta.getByText(/19\.500/)).toBeVisible();
  await shot(page, "5-venta", tag);
  await venta.getByRole("button", { name: "Cobrar" }).click();
  const dlg = page.getByRole("dialog", { name: "Cobrar" });
  await dlg.getByRole("button", { name: /50\.000/ }).click();
  await expect(dlg.getByText(/Devuelta: \$\s?30\.500/)).toBeVisible();
  await shot(page, "6-cobrar", tag);
  await dlg.getByRole("button", { name: "Terminar venta" }).click();
  await expect(dlg.getByText("¡Venta lista!")).toBeVisible();
  await expect(dlg.getByText(/Devuelta: \$\s?30\.500/)).toBeVisible();
  await shot(page, "7-lista", tag);
  await dlg.getByRole("button", { name: "Nueva venta" }).click();
  await expect(page.getByRole("heading", { name: "¿Qué busca el cliente?" })).toBeVisible();
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(m.scroll - m.inner, "sin scroll horizontal").toBeLessThanOrEqual(0);
});
