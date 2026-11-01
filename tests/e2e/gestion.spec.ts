/** Fases 3 y 5 en el navegador: páginas nuevas cargan, sin desbordar, y flujos principales funcionan. */
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, user: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(`${user}@eltrigal.test`);
  await page.getByLabel("Contraseña").fill("Nexora-Demo-2026");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Autorización/);
  }
}
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test("páginas de gestión: sedes, horarios y solicitudes", async ({ page }) => {
  await login(page, "admin");
  for (const [path, title] of [["/admin/sedes/nueva", "Nueva sede"], ["/admin/horarios", "Horarios"], ["/admin/solicitudes", "Solicitudes"]] as const) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await noOverflow(page);
  }
  await page.goto("/admin/horarios");
  await page.getByRole("link", { name: /Juan/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Horario de Juan/ })).toBeVisible();
  await noOverflow(page);
  await page.goto("/admin/sedes");
  await page.getByRole("link", { name: "Editar" }).first().click();
  await expect(page.getByRole("button", { name: "Rotar QR" })).toBeVisible();
  await noOverflow(page);
});

test("el límite de sedes del plan se respeta; la hoja de QR se puede imprimir", async ({ page }, info) => {
  await login(page, "admin");
  await page.goto("/admin/sedes/nueva");
  await page.getByLabel("Nombre de la sede").fill(`Puerto López ${info.project.name}`);
  await page.getByLabel("Ciudad").fill("Puerto López");
  await page.getByLabel("Dirección").fill("Cl. 5 # 6-7");
  await page.getByLabel("Latitud").fill("4.0950");
  await page.getByLabel("Longitud").fill("-72.9560");
  await page.getByRole("button", { name: "Crear sede" }).click();
  // La demo tiene el plan piloto: 4 sedes activas, todas ocupadas.
  await expect(page.getByRole("alert").filter({ hasText: "Tu plan permite 4 sedes activas." })).toBeVisible();

  await page.goto("/admin/sedes");
  const href = await page.getByRole("link", { name: "Imprimir QR" }).first().getAttribute("href");
  await page.goto(href!);
  await expect(page.getByText("Registra tu entrada y salida")).toBeVisible();
  await expect(page.locator("svg").first()).toBeVisible();
});

test("el administrador decide una hora extra de la demo; el empleado ve el resultado", async ({ page, browser }, info) => {
  await login(page, "admin");
  await page.goto("/admin/solicitudes");
  // Detecta las horas extra de las dos semanas simuladas de la demo.
  await page.getByRole("button", { name: "Revisar jornadas pasadas" }).click();
  await expect(page.getByText(/Se detectaron horas extra en \d+ días|No hay horas extra nuevas/)).toBeVisible();
  await page.reload();
  const approve = page.getByRole("button", { name: "Aprobar", exact: true }).first();
  if (info.project.name === "escritorio") {
    await approve.click();
    await expect(page.getByText("Horas extra aprobadas.")).toBeVisible();
  }
  const emp = await (await browser.newContext()).newPage();
  await login(emp, "laura");
  await emp.goto("/app/solicitudes");
  await expect(emp.getByRole("heading", { level: 1, name: "Solicitudes" })).toBeVisible();
  await emp.getByLabel("Desde").fill("2026-12-14");
  await emp.getByLabel("Hasta").fill("2026-12-18");
  await emp.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(emp.getByText(/Solicitud enviada|Ya hay una novedad/)).toBeVisible();
  await noOverflow(emp);
});
