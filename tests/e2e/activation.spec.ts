/**
 * Empleado sin correo ni contraseña: el administrador lo crea y recibe un código;
 * el empleado activa su celular con cédula + código, registra su huella/Face ID
 * y desde ahí entra solo con ella. Un celular nuevo reemplaza al anterior sin
 * que el administrador apruebe nada. La huella la simula el autenticador
 * virtual de Chrome (WebAuthn por CDP).
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

async function activate(page: Page, doc: string, code: string) {
  await page.goto("/activar");
  await page.getByLabel("Cédula").fill(doc);
  await page.getByLabel("Código de activación").fill(code.toLowerCase().replace("-", " "));
  await page.getByRole("button", { name: "Activar" }).click();
  await expect(page).toHaveURL(/\/autorizacion(\?|$)/);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Activar huella o Face ID" }).click();
  await expect(page.getByText("Te pediremos tu huella o Face ID")).toBeVisible();
}

test("activar con cédula + código, entrar con Face ID y cambiar de celular sin el administrador", async ({ browser }, info) => {
  test.skip(info.project.name !== "escritorio", "Un solo recorrido basta (crea su propio empleado).");
  test.setTimeout(90_000);
  const suffix = Date.now().toString(36);
  const doc = `8${Date.now().toString().slice(-8)}`;

  // 1. El administrador crea el empleado y recibe el código de activación.
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await adminLogin(admin);
  await admin.goto("/admin/empleados/nuevo");
  await admin.getByLabel("Nombres").fill("Mateo");
  await admin.getByLabel("Apellidos").fill(`Activa ${suffix}`);
  await admin.getByLabel("Número de documento").fill(doc);
  await admin.getByLabel("Correo", { exact: true }).fill(`activa-${suffix}@eltrigal.test`);
  await admin.getByLabel("Cargo").fill("Panadero");
  await admin.getByLabel("Sede habitual").selectOption({ label: "Acacías" });
  await admin.getByLabel("Salario mensual (COP)").fill("1800000");
  await admin.getByRole("button", { name: "Crear empleado" }).click();
  const code = (await admin.getByTestId("activation-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await expect(admin.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveAttribute("href", /wa\.me/);

  // 2. Un código equivocado no entra.
  const phone1 = await browser.newContext();
  const p1 = await phone1.newPage();
  await virtualAuthenticator(phone1, p1);
  await p1.goto("/activar");
  await p1.getByLabel("Cédula").fill("123456");
  await p1.getByLabel("Código de activación").fill(code);
  await p1.getByRole("button", { name: "Activar" }).click();
  await expect(p1.getByText("La cédula o el código no coinciden")).toBeVisible();

  // 3. Cédula + código correctos: celular activo y huella registrada, sin contraseña.
  await activate(p1, doc, code);

  // 4. El código no sirve dos veces.
  const other = await browser.newContext();
  const o = await other.newPage();
  await o.goto("/activar");
  await o.getByLabel("Cédula").fill(doc);
  await o.getByLabel("Código de activación").fill(code);
  await o.getByRole("button", { name: "Activar" }).click();
  await expect(o.getByText("La cédula o el código no coinciden")).toBeVisible();

  // 5. Cierra sesión y vuelve a entrar SOLO con Face ID / huella.
  await p1.context().clearCookies();
  await p1.goto("/ingresar");
  await p1.getByRole("button", { name: "Entrar con Face ID o huella" }).click();
  await expect(p1).toHaveURL(/\/app$/);
  await expect(p1.getByRole("button", { name: /Registrar (entrada|salida)/ })).toBeVisible();

  // 6. Celular nuevo: el administrador solo genera otro código (o lo recupera el empleado);
  // al activarlo, el anterior queda retirado sin aprobar nada.
  await admin.goto("/admin/empleados");
  await admin.getByRole("link", { name: new RegExp(`Mateo Activa ${suffix}`) }).click();
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: "Nuevo código de activación" }).click();
  const code2 = (await admin.getByTestId("activation-code").textContent())!.trim();
  const phone2 = await browser.newContext();
  const p2 = await phone2.newPage();
  await virtualAuthenticator(phone2, p2);
  await p2.goto("/activar");
  await p2.getByLabel("Cédula").fill(doc);
  await p2.getByLabel("Código de activación").fill(code2);
  await p2.getByRole("button", { name: "Activar" }).click();
  await expect(p2).toHaveURL(/\/app$/);
  await p2.getByRole("button", { name: "Activar huella o Face ID" }).click();
  await expect(p2.getByText("Te pediremos tu huella o Face ID")).toBeVisible();

  // El celular anterior perdió la sesión y su huella ya no abre Nexora.
  await p1.goto("/app");
  await expect(p1).toHaveURL(/\/ingresar/);
  await p1.getByRole("button", { name: "Entrar con Face ID o huella" }).click();
  await expect(p1.getByText("No reconocimos tu huella o Face ID")).toBeVisible();

  await Promise.all([adminCtx.close(), phone1.close(), phone2.close(), other.close()]);
});
