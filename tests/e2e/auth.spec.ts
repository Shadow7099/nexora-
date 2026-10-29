import { expect, test, type Page } from "@playwright/test";

const DEMO_PASSWORD = "Nexora-Demo-2026";

/** Inicia sesión y completa los pasos pendientes (autorización de datos) si aparecen. */
async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  // Espera la página final (puede haber varias redirecciones: /admin → /autorizacion).
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Autorización/);
  }
}

async function logout(page: Page) {
  const menu = page.getByRole("button", { name: "Abrir menú" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Cerrar sesión" }).last().click();
  await page.waitForURL("**/ingresar");
}

test("sin sesión, las zonas privadas redirigen al ingreso conservando el destino", async ({ page }) => {
  await page.goto("/admin/empleados");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Fadmin%2Fempleados/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/ingresar/);
});

test("credenciales incorrectas muestran un error genérico", async ({ page }) => {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill("nadie@eltrigal.test");
  await page.getByLabel("Contraseña").fill("no-es-la-clave-1");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorrectos" })).toHaveText("Correo o contraseña incorrectos.");
});

test("el administrador ve el resumen real de su empresa", async ({ page }) => {
  await login(page, "admin@eltrigal.test");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Resumen" })).toBeVisible();
  await expect(page.getByText("Turnos de hoy")).toBeVisible();
  // Los empleados de la demo aparecen en la tabla de turnos (otras pruebas pueden haber creado más).
  for (const name of ["Juan Pérez Castro", "Laura Gómez Ríos", "Diego Martínez Silva", "Paula Ramírez Ortiz"]) {
    await expect(page.locator("tbody tr", { hasText: name })).toHaveCount(1);
  }
  await page.goto("/admin/empleados");
  await expect(page.getByRole("link", { name: /Juan Pérez Castro/ })).toBeVisible();
});

test("un empleado no puede entrar al panel de administración", async ({ page }) => {
  await login(page, "juan@eltrigal.test");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1, name: /, Juan\.$/ })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/admin/empleados");
  await expect(page).toHaveURL(/\/app$/);
});

test("ciclo completo: crear empleado → primer ingreso → nueva contraseña → desactivar", async ({ browser }) => {
  test.setTimeout(90_000); // varios inicios de sesión con Argon2 (lento a propósito)
  const suffix = Date.now().toString(36);
  const email = `prueba-${suffix}@eltrigal.test`;

  // 1. El administrador crea el empleado y recibe la clave temporal.
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, "admin@eltrigal.test");
  await admin.goto("/admin/empleados/nuevo");
  await admin.getByLabel("Nombres").fill("Sofía");
  await admin.getByLabel("Apellidos").fill(`Prueba ${suffix}`);
  await admin.getByLabel("Número de documento").fill(`9${Date.now().toString().slice(-8)}`);
  await admin.getByLabel("Correo (para ingresar)").fill(email);
  await admin.getByLabel("Cargo").fill("Vendedora");
  await admin.getByLabel("Sede habitual").selectOption({ label: "Acacías" });
  await admin.getByLabel("Salario mensual (COP)").fill("1800000");
  await admin.getByRole("button", { name: "Crear empleado" }).click();
  const temp = (await admin.getByTestId("temp-password").textContent())!.trim();
  expect(temp).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);

  // 2. El empleado ingresa con la clave temporal: autorización de datos y nueva contraseña.
  const empCtx = await browser.newContext();
  const emp = await empCtx.newPage();
  await emp.goto("/ingresar");
  await emp.getByLabel("Correo").fill(email);
  await emp.getByLabel("Contraseña").fill(temp);
  await emp.getByRole("button", { name: "Ingresar" }).click();
  await expect(emp).toHaveURL(/\/cambiar-clave$/);
  await emp.getByLabel("Contraseña actual").fill(temp);
  await emp.getByLabel("Nueva contraseña", { exact: true }).fill("corta");
  await emp.getByLabel("Repite la nueva contraseña").fill("corta");
  await emp.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(emp.getByText(/Mínimo 10 caracteres/).first()).toBeVisible();
  await emp.getByLabel("Contraseña actual").fill(temp);
  await emp.getByLabel("Nueva contraseña", { exact: true }).fill("Sofia-Panaderia-2026");
  await emp.getByLabel("Repite la nueva contraseña").fill("Sofia-Panaderia-2026");
  await emp.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(emp).toHaveURL(/\/autorizacion$/);
  await emp.getByRole("checkbox").check();
  await emp.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(emp).toHaveURL(/\/app$/);
  await expect(emp.getByRole("heading", { level: 1, name: /, Sofía\.$/ })).toBeVisible();

  // 3. El administrador lo desactiva: la sesión del empleado deja de funcionar al instante.
  await admin.goto("/admin/empleados");
  await admin.getByRole("link", { name: new RegExp(`Sofía Prueba ${suffix}`) }).click();
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: "Desactivar" }).click();
  await expect(admin.getByText("Empleado desactivado. Se cerraron sus sesiones.")).toBeVisible();
  await emp.reload();
  await expect(emp).toHaveURL(/\/ingresar/);

  await adminCtx.close();
  await empCtx.close();
});

test("cerrar sesión invalida la sesión en el servidor", async ({ page }) => {
  await login(page, "laura@eltrigal.test");
  await expect(page).toHaveURL(/\/app$/);
  const cookies = await page.context().cookies();
  await logout(page);
  // Reutilizar la cookie anterior ya no sirve: la sesión se borró en la base de datos.
  await page.context().addCookies(cookies);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/ingresar/);
});

test("la cookie de sesión es httpOnly y no la puede leer JavaScript", async ({ page }) => {
  await login(page, "andres@eltrigal.test");
  const cookie = (await page.context().cookies()).find((c) => c.name.includes("nexora_session"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("nexora_session");
});

test("ninguna página privada desborda horizontalmente (escritorio y celular)", async ({ page }) => {
  const noOverflow = async (path: string) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} no debe tener scroll horizontal`).toBeLessThanOrEqual(0);
  };
  await login(page, "admin@eltrigal.test");
  for (const path of ["/admin", "/admin/empleados", "/admin/empleados/nuevo", "/admin/configuracion"]) await noOverflow(path);
  await page.goto("/admin/empleados");
  await page.getByRole("link", { name: /Juan Pérez Castro/ }).click();
  await noOverflow(new URL(page.url()).pathname);
  await logout(page);
  await login(page, "camila@eltrigal.test");
  await noOverflow("/app");
});

// Capturas para revisión visual de las pantallas reales (no son aserciones).
test("capturas de revisión con sesión", async ({ page }, info) => {
  const shot = (name: string) => page.screenshot({ path: `test-results/shots/${info.project.name}-${name}.png`, fullPage: true });
  await page.goto("/ingresar");
  await shot("ingresar");
  await login(page, "admin@eltrigal.test");
  await shot("admin-resumen");
  await page.goto("/admin/empleados");
  await shot("admin-empleados");
  await page.getByRole("link", { name: /Valentina/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Valentina/);
  await shot("admin-empleado");
  await logout(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await login(page, "valentina@eltrigal.test");
  await shot("app-oscuro");
});
