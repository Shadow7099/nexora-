/**
 * CRM estilo Ámbar en el celular, sin conectar nada: demostración con chats que
 * llegaron por anuncios, avisos, IA en el chat (pausar, respuesta automática,
 * marcar resuelto), comentarios de redes e informe de anuncios.
 */
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.CRM_SHOTS_DIR;

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("Nexora-Demo-2026");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
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
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
};

test("demostración del CRM en el celular: anuncios, avisos, IA en el chat, comentarios e informe", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "La demostración es de la empresa compartida: un solo recorrido, en el celular.");
  test.setTimeout(120_000);
  await login(page, "admin@eltrigal.test");
  await page.goto("/admin/crm/mensajes?ver=anuncios&q=zzz-ninguno");
  await page.getByRole("button", { name: /Ver demostración|Reiniciar demostración/ }).click();
  await expect(page.getByText(/Listo: \d+ chats y 4 comentarios de demostración/)).toBeVisible({ timeout: 30_000 });

  // Bandeja con avisos: personas por atender, chats por anuncios, comentarios y datos que le faltan a la IA.
  await page.goto("/admin/crm/mensajes");
  const avisos = page.getByRole("list", { name: "Avisos" });
  await expect(avisos.getByText(/piden? que lo.? atienda una persona/)).toBeVisible();
  await expect(avisos.getByText(/nuevos? hoy por anuncios/)).toBeVisible();
  await expect(avisos.getByText(/comentarios de redes por responder/)).toBeVisible();
  await expect(page.getByText("Respuesta automática de la IA:")).toBeVisible();
  await expect(page.getByRole("link", { name: /Andrés Rojas/ }).getByText("Nueva colección · Escríbenos por WhatsApp")).toBeVisible();
  await noOverflow(page);
  await shot(page, "1-bandeja");

  // Chat que llegó por anuncio: de dónde vino, IA en el chat y escribir como el cliente.
  await page.getByRole("link", { name: /Andrés Rojas/ }).click();
  await expect(page.getByText("Llegó por un anuncio:")).toBeVisible();
  await expect(page.getByRole("button", { name: "IA activa · Pausar" })).toBeVisible();
  await expect(page.getByText("Respuesta sugerida", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a las conversaciones" })).toBeVisible();
  await noOverflow(page);
  await shot(page, "2-chat-anuncio");
  await page.getByRole("button", { name: "Usar la respuesta de la IA" }).click();
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.locator("ol[aria-label='Mensajes'] li").last()).toContainText("¿Me confirmas la referencia");
  await page.getByLabel("Mensaje del cliente").fill("¿Hacen domicilios? Quiero pedir");
  await page.getByRole("button", { name: "Enviar como cliente" }).click();
  await expect(page.getByText(/La IA (respondió sola|dejó su respuesta sugerida)/)).toBeVisible();
  await page.getByRole("button", { name: "IA activa · Pausar" }).click();
  await expect(page.getByRole("button", { name: "IA pausada · Reactivar" })).toBeVisible();

  // Chat que pide una persona: se marca resuelto.
  await page.goto("/admin/crm/mensajes?ver=atender");
  await page.getByRole("link", { name: /Carlos Pérez/ }).click();
  await expect(page.getByRole("note").getByText(/^Atender persona/)).toBeVisible();
  await shot(page, "3-atender-persona");
  await page.getByRole("button", { name: "Marcar resuelto" }).click();
  await expect(page.getByRole("note").getByText(/^Atender persona/)).toHaveCount(0);

  // Comentarios de redes con la respuesta de la IA.
  await page.goto("/admin/crm/mensajes?tab=comentarios");
  const card = page.locator("article", { hasText: "Precio por DM porfa" });
  await expect(card.getByText("Interés en comprar")).toBeVisible();
  await noOverflow(page);
  await shot(page, "4-comentarios");
  await card.getByRole("button", { name: "Responder por privado" }).click();
  // Atendido, sale de Pendientes y queda en «Respondidos por privado»; su chat quedó en la bandeja.
  await expect(card).toHaveCount(0);
  await page.getByRole("link", { name: /Respondidos por privado \(1\)/ }).click();
  await expect(page.getByText("Precio por DM porfa")).toBeVisible();
  await page.goto("/admin/crm/mensajes?q=sofi");
  await expect(page.getByRole("link", { name: /@sofi\.rz/ })).toBeVisible();

  // Informe de anuncios.
  await page.goto("/admin/crm/mensajes?tab=anuncios");
  await expect(page.getByText("Promo de temporada · 20 % de descuento").first()).toBeVisible();
  await expect(page.getByText("Valor ganado", { exact: true }).first()).toBeVisible();
  await noOverflow(page);
  await shot(page, "5-anuncios");

  // Agenda con botones: @valen.moda recibió los días; toca un día y una hora como lo haría en WhatsApp.
  await page.goto("/admin/crm/mensajes?q=valen");
  await page.getByRole("link", { name: /@valen\.moda/ }).last().click();
  const chat = page.locator("ol[aria-label='Mensajes']");
  await expect(chat.getByText("¿Qué día te queda mejor para tu cita")).toBeVisible();
  await shot(page, "6-botones-dias");
  await chat.locator("li").last().getByRole("button").first().click();
  await expect(chat.getByText(/Estas son las horas libres del/)).toBeVisible();
  await chat.locator("li").last().getByRole("button").first().click();
  await expect(chat.getByText(/Tu cita quedó para el/)).toBeVisible();
  await noOverflow(page);
  await shot(page, "7-cita-confirmada");

  // Agenda: la cita aparece y se marca.
  await page.goto("/admin/crm/agenda");
  const cita = page.locator("li", { hasText: "@valen.moda" });
  await expect(cita.getByText("Agendada")).toBeVisible();
  await expect(cita.getByText(/Botones del chat/)).toBeVisible();
  await noOverflow(page);
  await shot(page, "8-agenda");
  await cita.getByRole("button", { name: "Confirmar" }).click();
  await expect(cita.getByText("Confirmada")).toBeVisible();

  // Aprendizaje diario: analizar ahora deja el informe y la versión en el historial.
  await page.goto("/admin/crm/mensajes?tab=ia");
  await page.getByRole("button", { name: "Analizar la semana ahora" }).click();
  await expect(page.getByText(/Listo: (la IA aplicó|no encontró)/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Último informe/)).toBeVisible();
  await expect(page.getByText("Aprendizaje diario").first()).toBeVisible();
  await noOverflow(page);
  await shot(page, "9-aprendizaje");

  // Se borra entera.
  await page.goto("/admin/crm/mensajes");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar demostración" }).click();
  // Sin chats de demostración (otras pruebas pueden tener chats reales en esta empresa).
  await expect(page.getByRole("button", { name: "Borrar demostración" })).toHaveCount(0);
  await expect(page.getByText("Demo", { exact: true })).toHaveCount(0);
});
