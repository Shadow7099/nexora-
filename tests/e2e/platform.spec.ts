/** Fase 8 en el navegador: el superadministrador da de alta una empresa y su administrador hace el primer ingreso. */
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
}
const noOverflow = async (page: Page) => {
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth, screen: window.screen.width }));
  expect(m.scroll - m.inner).toBeLessThanOrEqual(0);
  expect(m.inner).toBeLessThanOrEqual(m.screen);
};

test("alta de empresa → primer ingreso del administrador → panel vacío de su empresa", async ({ page, browser }, info) => {
  const email = `rosa-${info.project.name}-${Date.now()}@cafe.test`;
  await login(page, "plataforma@nexora.test", "Nexora-Demo-2026");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  }
  await page.getByRole("link", { name: "Nueva empresa" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nueva empresa" })).toBeVisible();
  await noOverflow(page);
  await page.getByLabel("Nombre comercial").fill(`Café Ñandú ${info.project.name}`);
  await page.getByLabel("NIT (opcional)").fill("900.123.456-7");
  await page.getByLabel("Límite de sedes (opcional)").fill("2");
  await page.getByLabel("Nombre completo").fill("Rosa Díaz");
  await page.getByLabel("Correo").fill(email);
  await page.getByRole("button", { name: "Crear empresa" }).click();
  const temp = (await page.getByTestId("temp-password").textContent())!.trim();
  expect(temp).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-plataforma-nueva.png`, fullPage: true });

  await page.getByRole("link", { name: "Ver la empresa" }).click();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("debe crear su contraseña")).toBeVisible();
  await noOverflow(page);

  // El administrador nuevo ingresa en otro navegador.
  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  await login(admin, email, temp);
  await expect(admin).toHaveURL(/\/cambiar-clave/);
  await admin.getByLabel("Contraseña actual").fill(temp);
  await admin.getByLabel("Nueva contraseña", { exact: true }).fill("Rosa-Cafe-Nandu-2026");
  await admin.getByLabel("Repite la nueva contraseña").fill("Rosa-Cafe-Nandu-2026");
  await admin.getByRole("button", { name: /Guardar|Cambiar/ }).click();
  await expect(admin).toHaveURL(/\/autorizacion/);
  await admin.getByRole("checkbox").check();
  await admin.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "Resumen" })).toBeVisible();
  await expect(admin.getByText(`Café Ñandú ${info.project.name}`).first()).toBeAttached(); // en celular está dentro del menú cerrado

  // Suspender la empresa cierra su sesión.
  await page.getByRole("button", { name: "Suspender" }).click();
  await expect(page.getByText("Suspendida")).toBeVisible();
  await admin.reload();
  await expect(admin).toHaveURL(/\/ingresar/);
  await ctx.close();
});

test("ingreso: ayuda para recuperar la contraseña", async ({ page }) => {
  await page.goto("/ingresar");
  await page.getByText("¿Olvidaste tu contraseña?").click();
  await expect(page.getByText(/pide a tu administrador una contraseña temporal/)).toBeVisible();
});

test("autogestión: link de invitación → el dueño registra su negocio → primeros pasos", async ({ page, browser }, info) => {
  await login(page, "plataforma@nexora.test", "Nexora-Demo-2026");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  }
  await page.waitForURL(/\/plataforma$/);
  await page.goto("/plataforma/invitaciones");
  await page.getByLabel("Para quién es").fill(`Droguería ${info.project.name}`);
  await page.getByLabel("Límite de sedes").fill("2");
  await page.getByRole("button", { name: "Generar link" }).click();
  const url = (await page.getByTestId("invitation-url").textContent())!.trim();
  expect(url).toMatch(/\/registro\/[A-Za-z0-9_-]{32}$/);
  await noOverflow(page);

  // El dueño, sin cuenta, abre el link en su navegador.
  const ctx = await browser.newContext();
  const owner = await ctx.newPage();
  await owner.goto(url);
  await expect(owner.getByRole("heading", { level: 1, name: "Registra tu empresa" })).toBeVisible();
  await noOverflow(owner);
  await owner.getByLabel("Nombre del negocio").fill(`Droguería La Salud ${info.project.name}`);
  await owner.getByLabel("Tu nombre completo").fill("Rosa Díaz");
  await owner.getByLabel("Correo").fill(`rosa-${info.project.name}-${Date.now()}@drogueria.test`);
  await owner.getByLabel("Contraseña", { exact: true }).fill("Rosa-Drogueria-2026");
  await owner.getByLabel("Repite la contraseña").fill("Rosa-Drogueria-2026");
  await owner.getByRole("button", { name: "Crear mi empresa" }).click();
  await expect(owner.getByText("Debes aceptar para continuar.")).toBeVisible(); // sin marcar la casilla
  await owner.getByLabel("Contraseña", { exact: true }).fill("Rosa-Drogueria-2026");
  await owner.getByLabel("Repite la contraseña").fill("Rosa-Drogueria-2026");
  await owner.getByRole("checkbox").check();
  await owner.getByRole("button", { name: "Crear mi empresa" }).click();
  await expect(owner).toHaveURL(/\/autorizacion/);
  await owner.getByRole("checkbox").check();
  await owner.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(owner.getByRole("heading", { level: 1, name: "Primeros pasos" })).toBeVisible();
  await expect(owner.getByText("0 de 6 pasos completos")).toBeVisible();
  await noOverflow(owner);
  await owner.screenshot({ path: `test-results/shots/${info.project.name}-primeros-pasos.png`, fullPage: true });

  // El primer paso lleva a Configuración; al guardar, el avance sube.
  await owner.getByRole("link", { name: "Abrir configuración" }).click();
  await owner.getByRole("button", { name: "Guardar" }).click();
  await expect(owner.getByText("Configuración guardada.")).toBeVisible();
  await owner.goto("/admin/primeros-pasos");
  await expect(owner.getByText("1 de 6 pasos completos")).toBeVisible();
  await owner.goto("/admin");
  await expect(owner.getByText("Termina de configurar tu negocio")).toBeVisible();

  // El link ya no sirve otra vez.
  await owner.goto(url);
  await expect(owner.getByRole("heading", { level: 1, name: "Link no disponible" })).toBeVisible();
  await ctx.close();

  await page.reload();
  await expect(page.getByText("Usada").first()).toBeVisible();
});
