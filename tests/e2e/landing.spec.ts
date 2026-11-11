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
    for (const h of ["Tres pasos y tu negocio queda andando", "Control serio, sin complicaciones", "Lo mejor del reloj biométrico, sin el reloj", "Un precio fijo según tu tamaño", "Empieza hoy. Tu negocio, configurado en 20 minutos.", "¿Prefieres que te ayudemos?"]) {
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

test("el formulario de contacto valida, se envía y llega a Plataforma → Solicitudes", async ({ page, browser }, info) => {
  const business = `Panadería Prueba ${info.project.name} ${Date.now()}`;
  await page.goto("/#solicitar");
  await page.getByRole("button", { name: "Quiero que me contacten" }).click();
  await expect(page.getByText("Escribe el nombre del negocio.")).toBeVisible();
  await page.getByLabel("Nombre del negocio").fill(business);
  await page.getByLabel("Tu nombre").fill("Rosa Díaz");
  await page.getByLabel("Correo").fill("rosa@panaderia.test");
  await page.getByLabel("Celular / WhatsApp").fill("3001234567");
  await page.getByLabel("¿Cuántos empleados?").selectOption("6-15");
  await page.getByLabel("¿Cuántas sedes? (opcional)").fill("3");
  await page.getByLabel(/Autorizo a Nexora/).check();
  await page.getByRole("button", { name: "Quiero que me contacten" }).click();
  await expect(page.getByText(/Recibimos tus datos/)).toBeVisible();

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

test("desde la landing, el dueño crea su cuenta y entra a Primeros pasos", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Crear mi cuenta" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Crea tu cuenta" })).toBeVisible();
  await noOverflow(page);
  await page.getByLabel("Nombre del negocio").fill(`Ferretería ${info.project.name}`);
  await page.getByLabel("Tu nombre completo").fill("Carlos Ruiz");
  await page.getByLabel("Correo").fill(`carlos-${info.project.name}-${Date.now()}@ferreteria.test`);
  await page.getByLabel("Contraseña", { exact: true }).fill("Carlos-Ferreteria-2026");
  await page.getByLabel("Repite la contraseña").fill("Carlos-Ferreteria-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear mi empresa" }).click();
  await expect(page).toHaveURL(/\/autorizacion/);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Primeros pasos" })).toBeVisible();
  await expect(page.getByText("0 de 6 pasos completos")).toBeVisible();
  // El ingreso ofrece crear cuenta.
  await page.context().clearCookies();
  await page.goto("/ingresar");
  await expect(page.getByRole("link", { name: "Crea tu cuenta" })).toBeVisible();
});

test("el asistente de la landing responde, sugiere preguntas y lleva al registro", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir el asistente de Nexora" }).click();
  const chat = page.getByRole("dialog", { name: "Asistente de Nexora" });
  await expect(chat).toBeVisible();
  await expect(chat.getByText(/Soy el asistente de Nexora/)).toBeVisible();
  await noOverflow(page);

  // Sugerencia rápida.
  await chat.getByRole("button", { name: "¿Cuánto cuesta?" }).click();
  await expect(chat.getByText(/\$99\.900/)).toBeVisible();

  // Pregunta escrita.
  await chat.getByLabel("Escribe tu pregunta").fill("¿pueden marcar desde la casa?");
  await chat.getByLabel("Escribe tu pregunta").press("Enter");
  await expect(chat.getByText(/la marcación se rechaza/)).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-chat.png` });

  // Escape cierra; el enlace lleva al registro.
  await page.keyboard.press("Escape");
  await expect(chat).toBeHidden();
  await page.getByRole("button", { name: "Abrir el asistente de Nexora" }).click();
  await chat.getByLabel("Escribe tu pregunta").fill("quiero registrarme");
  await chat.getByRole("button", { name: "Enviar" }).click();
  await chat.getByRole("link", { name: "Crear mi cuenta" }).last().click();
  await expect(page.getByRole("heading", { level: 1, name: "Crea tu cuenta" })).toBeVisible();
});
