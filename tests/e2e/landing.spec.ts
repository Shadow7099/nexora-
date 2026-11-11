/** Página de inicio pública: secciones, sin desbordes, y el formulario de invitación llega a Plataforma. */
import { expect, test, type Page } from "@playwright/test";

const noOverflow = async (page: Page) => {
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth, screen: window.screen.width }));
  expect(m.scroll - m.inner, "sin scroll horizontal").toBeLessThanOrEqual(0);
  expect(m.inner, "el viewport no se agranda").toBeLessThanOrEqual(m.screen);
};

test("la landing muestra todas las secciones en claro y oscuro", async ({ page }, info) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Sabe quién trabajó/ })).toBeVisible();
    for (const h of ["Tres pasos y tu negocio queda andando", "Control serio, sin complicaciones", "Lo mejor del reloj biométrico, sin el reloj", "Un precio fijo según tu tamaño", "Solicita tu invitación"]) {
      await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
    }
    await expect(page.getByText("$99.900")).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: `test-results/shots/${info.project.name}-landing-${theme}.png`, fullPage: true });
  }
  // Las preguntas se despliegan.
  await page.getByText("¿Tengo que comprar algún equipo?").click();
  await expect(page.getByText(/Imprimes un código QR por sede/)).toBeVisible();
  // «Ingresar» lleva al inicio de sesión.
  await page.getByRole("link", { name: "Ingresar" }).first().click();
  await expect(page).toHaveURL(/\/ingresar/);
});

test("el formulario de invitación valida, se envía y llega a Plataforma → Solicitudes", async ({ page, browser }, info) => {
  const business = `Panadería Prueba ${info.project.name} ${Date.now()}`;
  await page.goto("/#solicitar");
  await page.getByRole("button", { name: "Solicitar mi invitación" }).click();
  await expect(page.getByText("Escribe el nombre del negocio.")).toBeVisible();
  await page.getByLabel("Nombre del negocio").fill(business);
  await page.getByLabel("Tu nombre").fill("Rosa Díaz");
  await page.getByLabel("Correo").fill("rosa@panaderia.test");
  await page.getByLabel("Celular / WhatsApp").fill("3001234567");
  await page.getByLabel("¿Cuántos empleados?").selectOption("6-15");
  await page.getByLabel("¿Cuántas sedes? (opcional)").fill("3");
  await page.getByLabel(/Autorizo a Nexora/).check();
  await page.getByRole("button", { name: "Solicitar mi invitación" }).click();
  await expect(page.getByText(/Recibimos tu solicitud/)).toBeVisible();

  const ctx = await browser.newContext();
  const sa = await ctx.newPage();
  await sa.goto("/ingresar");
  await sa.getByLabel("Correo").fill("plataforma@nexora.test");
  await sa.getByLabel("Contraseña").fill("Nexora-Demo-2026");
  await sa.getByRole("button", { name: "Ingresar" }).click();
  await expect(sa.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
  await sa.goto("/plataforma/solicitudes");
  if (new URL(sa.url()).pathname === "/autorizacion") {
    await sa.getByRole("checkbox").check();
    await sa.getByRole("button", { name: "Aceptar y continuar" }).click();
    await sa.waitForURL(/\/plataforma/);
    await sa.goto("/plataforma/solicitudes");
  }
  const card = sa.locator("li").filter({ hasText: business });
  await expect(card).toBeVisible();
  await expect(card.getByText("6 a 15 empleados · 3 sede(s)")).toBeVisible();
  await card.getByRole("button", { name: "Contactada" }).click();
  await expect(card.getByText("Contactada")).toBeVisible();
  await noOverflow(sa);
  await ctx.close();
});
