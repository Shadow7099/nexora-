/** Bandeja de mensajes en el navegador: un WhatsApp entra por el aviso firmado, se lee, se intenta responder; IA y plantillas. */
import { createHmac } from "node:crypto";
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

test("bandeja: llega un WhatsApp, se lee y la respuesta rechazada por Meta se muestra; IA y plantillas", async ({ page, request }, info) => {
  const tag = info.project.name;
  const phone = tag === "escritorio" ? "573015550001" : "573015550002";
  await login(page, "admin@eltrigal.test");

  // WhatsApp conectado (token falso: Meta rechazará los envíos).
  await page.goto("/admin/integraciones");
  const wa = page.getByRole("region", { name: /WhatsApp Business/ });
  if (await wa.getByRole("button", { name: "Desconectar" }).count() === 0) {
    await wa.getByLabel("ID del número de teléfono").fill("100000000000000");
    await wa.getByLabel("ID de la cuenta de WhatsApp Business (WABA)").fill("200000000000000");
    await wa.getByLabel("Token de acceso permanente").fill("token-falso-e2e");
    await wa.getByLabel("Clave secreta de la app de Meta (opcional)").fill("secreto-e2e");
    await wa.getByRole("button", { name: "Guardar" }).click();
    await expect(wa.getByText("Guardado.")).toBeVisible();
  }
  const url = await wa.getByLabel("URL privada (no la compartas)").inputValue();

  // Llega un mensaje (aviso firmado como lo firma Meta).
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { contacts: [{ wa_id: phone, profile: { name: `Sofía ${tag}` } }], messages: [{ id: `wamid.e2e.${tag}.${Date.now()}`, from: phone, type: "text", timestamp: String(Math.floor(Date.now() / 1000)), text: { body: "Hola, ¿tienen torta de chocolate?" } }] } }] }],
  });
  const res = await request.post(new URL(url).pathname, { data: body, headers: { "Content-Type": "application/json", "X-Hub-Signature-256": `sha256=${createHmac("sha256", "secreto-e2e").update(body).digest("hex")}` } });
  expect(res.status()).toBe(200);
  expect((await request.post(new URL(url).pathname, { data: body, headers: { "Content-Type": "application/json", "X-Hub-Signature-256": "sha256=00" } })).status()).toBe(401);

  await page.goto("/admin/crm/mensajes");
  await expect(page.getByRole("heading", { level: 1, name: "Mensajes" })).toBeVisible();
  const item = page.getByRole("link", { name: new RegExp(`Sofía ${tag}`) });
  await expect(item).toBeVisible();
  await expect(item.getByLabel("1 sin leer")).toBeVisible();
  await item.click();
  await expect(page.getByRole("list", { name: "Mensajes" }).getByText("Hola, ¿tienen torta de chocolate?")).toBeVisible();
  await expect(page.getByText(/Puedes responder hasta/)).toBeVisible();

  await page.getByLabel("Escribe tu respuesta").fill("¡Hola Sofía! Sí, la porción vale $7.000.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /WhatsApp no aceptó el mensaje|No se pudo conectar/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Escribe tu respuesta")).toHaveValue("¡Hola Sofía! Sí, la porción vale $7.000."); // no se pierde lo escrito
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${tag}-mensajes.png`, fullPage: true });

  // IA: sin llave de Claude no se puede activar.
  await page.getByRole("link", { name: "IA de mensajes" }).click();
  await expect(page.getByText("Para usar la IA, guarda tu llave de Claude")).toBeVisible();
  await page.getByLabel("Lo que la IA sabe de tu negocio").fill("Domicilios en Villavicencio: $5.000.");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Configuración de la IA guardada.")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${tag}-mensajes-ia.png`, fullPage: true });

  // Plantillas: borrador validado; enviarla a Meta con un token falso muestra el rechazo.
  await page.getByRole("link", { name: "Plantillas de WhatsApp" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill(`retomar_${tag}`);
  await page.getByLabel("Mensaje", { exact: true }).fill("Hola {{1}}, ¿seguimos con tu pedido? Responde y te ayudamos.");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText(/Escribe un ejemplo para cada variable/)).toBeVisible();
  await page.getByLabel("Ejemplo para {{1}}").fill("Ana");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText("Plantilla guardada como borrador.")).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: `retomar_${tag}` });
  await expect(row.getByText("Borrador")).toBeVisible();
  await row.getByRole("button", { name: "Enviar a Meta" }).click();
  await expect(row.getByRole("alert")).toBeVisible({ timeout: 20_000 });
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${tag}-plantillas.png`, fullPage: true });
});
