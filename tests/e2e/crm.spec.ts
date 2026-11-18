/** CRM en el navegador: cliente, oportunidad por etapas, tarea, y un lead que entra por la dirección privada. */
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

test("CRM: cliente, oportunidad, tarea y lead entrante", async ({ page, request }, info) => {
  const tag = info.project.name;
  await login(page, "admin@eltrigal.test");

  // Cliente nuevo.
  await page.goto("/admin/crm/clientes/nuevo");
  await page.getByLabel("Nombre o razón social").fill(`Hotel Llano ${tag}`);
  await page.getByLabel("Celular / WhatsApp").fill(tag === "escritorio" ? "3001110001" : "3001110002");
  await page.getByLabel(/autorizó recibir mensajes comerciales/).check();
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Hotel Llano ${tag}` })).toBeVisible();
  await expect(page.getByText("Autorizó mensajes comerciales")).toBeVisible();

  // Oportunidad y cambio de etapa.
  await page.getByLabel("¿Qué quiere el cliente?").fill("Pan para desayunos");
  await page.getByLabel("Valor estimado (opcional)").fill("1200000");
  await page.getByRole("button", { name: "Crear oportunidad" }).click();
  await expect(page.getByText("Oportunidad creada.")).toBeVisible();
  await page.getByLabel("Etapa de Pan para desayunos").selectOption("PROPOSAL");
  await page.getByRole("button", { name: "Mover" }).click();
  await expect(page.getByText("«Pan para desayunos»: Nuevo → Propuesta")).toBeVisible();

  // Tarea con fecha.
  await page.getByLabel("Tipo", { exact: true }).selectOption("TASK");
  await page.getByLabel("¿Qué hay que hacer?").fill("Enviar cotización");
  await page.getByLabel("Fecha y hora").fill("2026-11-18T09:00");
  await page.getByRole("button", { name: "Programar tarea" }).click();
  await expect(page.getByText("Seguimiento registrado.")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${tag}-crm-cliente.png`, fullPage: true });

  // El embudo muestra la oportunidad y la tarea pendiente; se marca hecha.
  await page.goto("/admin/crm");
  await expect(page.getByRole("region", { name: /Propuesta/ }).getByText("Pan para desayunos").first()).toBeVisible();
  const task = page.getByRole("listitem").filter({ hasText: "Enviar cotización" }).filter({ hasText: `Hotel Llano ${tag}` });
  await task.getByRole("button", { name: "Hecha" }).click();
  await expect(task).toHaveCount(0);

  // Entrada de leads: se activa en Integraciones y recibe un lead de TikTok.
  await page.goto("/admin/integraciones");
  const card = page.getByRole("region", { name: /Entrada de leads/ });
  if (await card.getByRole("button", { name: "Desconectar" }).count() === 0) {
    await card.getByRole("button", { name: "Guardar" }).click();
    await expect(card.getByText("Guardado.")).toBeVisible();
  }
  const url = await card.getByLabel("URL privada (no la compartas)").inputValue();
  expect(url).toMatch(/\/api\/webhooks\/leads\/[A-Za-z0-9_-]{20,}$/);
  const res = await request.post(new URL(url).pathname, { data: { name: `Lead TikTok ${tag}`, phone: tag === "escritorio" ? "3209990001" : "3209990002", source: "TIKTOK", campaign: "Navidad" } });
  expect(res.status()).toBe(200);
  expect((await request.post(new URL(url).pathname.replace(/[^/]+$/, "token-falso-00000000000000"), { data: {} })).status()).toBe(404);

  await page.goto("/admin/crm");
  await expect(page.getByRole("region", { name: /Nuevo/ }).getByText(`Lead TikTok ${tag}`)).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${tag}-crm.png`, fullPage: true });
});
