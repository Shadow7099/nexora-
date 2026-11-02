/**
 * Fase 7 en el navegador: tablero con indicadores y gráficos, filtros, vista
 * previa y descargas. Prueba obligatoria 7 de punta a punta: el total del Excel
 * descargado coincide con el de la vista previa (y esta, con la base: tests/db/reports.test.ts).
 */
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
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
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth, screen: window.screen.width }));
  expect(m.scroll - m.inner, "sin scroll horizontal").toBeLessThanOrEqual(0);
  expect(m.inner, "el viewport no se agranda").toBeLessThanOrEqual(m.screen);
};
// Rango con las marcaciones simuladas de la demo.
const RANGE = "desde=2026-10-16&hasta=2026-10-31";

test("tablero: indicadores, gráficos y filtros con datos reales", async ({ page }, info) => {
  await login(page, "admin@eltrigal.test");
  await page.goto(`/admin/reportes?${RANGE}`);
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
  const main = page.getByRole("main");
  for (const k of ["Asistencia", "Puntualidad", "Ausencias", "Horas trabajadas", "Horas extra aprobadas", "Costo estimado"]) await expect(main.getByText(k, { exact: true }).first()).toBeVisible();
  // Los cuatro gráficos se dibujan (SVG de Recharts) y tienen su tabla accesible.
  // Asistencia, puntualidad y horas por sede tienen datos; el costo depende de que haya pre-nóminas calculadas.
  await expect(page.locator(".recharts-wrapper")).toHaveCount(3 + (await page.getByText("Sin datos en este período").count() ? 0 : 1), { timeout: 10_000 });
  for (const h of ["Asistencia por semana", "Puntualidad por mes", "Horas trabajadas por sede", "Costo estimado por período de nómina"]) await expect(main.getByRole("heading", { name: h })).toBeVisible();
  // Cada gráfico con datos ofrece la misma información en tabla.
  await expect(page.getByText("Ver datos en tabla")).toHaveCount(await page.locator(".recharts-wrapper").count());
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-reportes.png`, fullPage: true });

  // Filtrar por una sede: la URL conserva los filtros.
  await page.getByLabel("Sede").selectOption({ label: "Villavicencio Centro" });
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/sede=/);
  await expect(page.getByLabel("Sede")).toHaveValue(/.+/);
});

test("vista previa y descarga en Excel: mismos totales; CSV y PDF se descargan", async ({ page }) => {
  await login(page, "admin@eltrigal.test");
  await page.goto(`/admin/reportes/asistencia?${RANGE}`);
  await expect(page.getByRole("heading", { level: 1, name: "Asistencia por período" })).toBeVisible();
  const totalRow = page.locator("tfoot tr");
  await expect(totalRow).toContainText("Total");
  const headers = await page.locator("thead th").allTextContents();
  const workedIdx = headers.indexOf("Horas trabajadas");
  const shown = (await totalRow.locator("td").nth(workedIdx).textContent())!.trim(); // "1.234,50"
  await noOverflow(page);

  const [xlsx] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Excel" }).click()]);
  expect(xlsx.suggestedFilename()).toBe("nexora-asistencia-2026-10-16_2026-10-31.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await readFile((await xlsx.path())!)) as unknown as ArrayBuffer);
  const rows = (wb.worksheets[0]!.getSheetValues().filter(Boolean) as unknown[][]);
  expect(String(rows[1]![1])).toContain("Panadería El Trigal");
  const total = rows.find((r) => r[1] === "Total")!;
  expect(Number(total[workedIdx + 1]).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe(shown);

  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "CSV" }).click()]);
  expect((await readFile((await csv.path())!, "utf8")).split("\r\n")[0]).toContain("Asistencia por período");
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "PDF" }).click()]);
  expect((await readFile((await pdf.path())!)).subarray(0, 5).toString()).toBe("%PDF-");
});

test("los otros reportes abren; un empleado no puede descargar", async ({ page, request }) => {
  await login(page, "admin@eltrigal.test");
  for (const [k, title] of [["horas-extra", "Horas extra"], ["novedades", "Novedades"], ["pre-nomina", "Pre-nómina estimada"], ["intentos", "Intentos rechazados"]]) {
    expect((await page.goto(`/admin/reportes/${k}?${RANGE}`))?.status(), k).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
  expect((await page.goto("/admin/reportes/no-existe"))?.status()).toBe(404);

  await page.context().clearCookies();
  await login(page, "juan@eltrigal.test");
  const res = await page.request.get(`/admin/reportes/descargar/asistencia?${RANGE}&formato=csv`, { maxRedirects: 0 });
  expect(res.status()).toBe(403);
  // Sin sesión: redirige al ingreso.
  const anon = await request.get(`/admin/reportes/descargar/asistencia?formato=csv`, { maxRedirects: 0 });
  expect(anon.status()).toBe(307);
});
