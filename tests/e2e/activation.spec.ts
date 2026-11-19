/**
 * Empleado sin correo ni contraseña: el administrador lo crea y recibe un código
 * de acceso permanente; el empleado entra solo con ese código. El administrador
 * decide si se le exige Face ID o huella. Un celular nuevo reemplaza al anterior
 * sin aprobaciones. La huella la simula el autenticador virtual de Chrome.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const DEMO_PASSWORD = "Nexora-Demo-2026";

async function adminLogin(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill("admin@eltrigal.test");
  await page.getByLabel("Contraseña").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/ingresar/);
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  }
  await expect(page).toHaveURL(/\/admin/);
}

async function virtualAuthenticator(context: BrowserContext, page: Page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true },
  });
}

async function codeLogin(page: Page, code: string, firstTime = true) {
  await page.goto("/ingresar");
  await page.getByLabel("Código de empleado").fill(code);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  if (firstTime) {
    await expect(page).toHaveURL(/\/autorizacion(\?|$)/);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  }
  await expect(page).toHaveURL(/\/app$/);
}

test("entrar solo con el código; Face ID según el administrador; celular nuevo sin aprobaciones", async ({ browser }, info) => {
  test.skip(info.project.name !== "escritorio", "Un solo recorrido basta (crea su propio empleado).");
  test.setTimeout(120_000);
  const suffix = Date.now().toString(36);

  // 1. El administrador crea el empleado (sin exigir Face ID) y recibe el código.
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await adminLogin(admin);
  await admin.goto("/admin/empleados/nuevo");
  await admin.getByLabel("Nombres").fill("Mateo");
  await admin.getByLabel("Apellidos").fill(`Codigo ${suffix}`);
  await admin.getByLabel("Número de documento").fill(`8${Date.now().toString().slice(-8)}`);
  await admin.getByLabel("Correo", { exact: true }).fill(`codigo-${suffix}@eltrigal.test`);
  await admin.getByLabel("Cargo").fill("Panadero");
  await admin.getByLabel("Sede habitual").selectOption({ label: "Acacías" });
  await admin.getByLabel("Salario mensual (COP)").fill("1800000");
  await admin.getByRole("button", { name: "Crear empleado" }).click();
  const code = (await admin.getByTestId("access-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  await expect(admin.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveAttribute("href", /wa\.me/);

  // 2. Código equivocado: no entra.
  const phone1 = await browser.newContext();
  const p1 = await phone1.newPage();
  await virtualAuthenticator(phone1, p1);
  await p1.goto("/ingresar");
  await p1.getByLabel("Código de empleado").fill("ZZZZZ-ZZZZZ");
  await p1.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(p1.getByText("Código incorrecto")).toBeVisible();

  // 3. Con su código entra de una vez; Face ID es opcional (se le ofrece, no se le exige).
  await codeLogin(p1, code.toLowerCase());
  await expect(p1.getByText("Protege tus marcaciones con tu huella o Face ID")).toBeVisible();
  await expect(p1.getByText("Activa tu huella o Face ID para marcar")).toHaveCount(0);

  // 4. El código es permanente: después de cerrar sesión vuelve a entrar con el mismo.
  await p1.context().clearCookies();
  await codeLogin(p1, code, false);

  // 5. El administrador ve el código en la ficha y le exige Face ID.
  await admin.goto("/admin/empleados");
  await admin.getByRole("link", { name: new RegExp(`Mateo Codigo ${suffix}`) }).click();
  await expect(admin.getByTestId("access-code")).toHaveText(code);
  await admin.getByRole("button", { name: "Exigir Face ID o huella" }).click();
  await expect(admin.getByText("Ahora debe marcar con Face ID o huella.")).toBeVisible();
  await p1.reload();
  await expect(p1.getByText("Activa tu huella o Face ID para marcar")).toBeVisible();
  await p1.getByRole("button", { name: "Activar huella o Face ID" }).click();
  await expect(p1.getByText("Te pediremos tu huella o Face ID")).toBeVisible();

  // 6. También puede entrar solo con Face ID.
  await p1.context().clearCookies();
  await p1.goto("/ingresar");
  await p1.getByRole("button", { name: "Entrar con Face ID o huella" }).click();
  await expect(p1).toHaveURL(/\/app$/);

  // 7. Celular nuevo con el mismo código: reemplaza al anterior sin aprobación.
  const phone2 = await browser.newContext();
  const p2 = await phone2.newPage();
  await virtualAuthenticator(phone2, p2);
  await codeLogin(p2, code, false);
  await expect(p2.getByText("Activa tu huella o Face ID para marcar")).toBeVisible();
  await p1.goto("/app");
  await expect(p1).toHaveURL(/\/ingresar/);

  // 8. Cambiar el código: el anterior deja de servir.
  await admin.reload();
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: "Cambiar código" }).click();
  await expect(admin.getByText("Código cambiado.")).toBeVisible();
  const code2 = (await admin.getByTestId("access-code").textContent())!.trim();
  expect(code2).not.toBe(code);
  await p2.goto("/app");
  await expect(p2).toHaveURL(/\/ingresar/);
  await p2.getByLabel("Código de empleado").fill(code);
  await p2.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(p2.getByText("Código incorrecto")).toBeVisible();

  await Promise.all([adminCtx.close(), phone1.close(), phone2.close()]);
});
