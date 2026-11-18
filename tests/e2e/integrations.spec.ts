/** Integraciones en el navegador: guardar sin volver a mostrar el token, probar, desconectar; llave de Claude de la plataforma. */
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

test("el administrador conecta TikTok: el token no se vuelve a mostrar y puede desconectarlo", async ({ page }, info) => {
  await login(page, "admin@eltrigal.test");
  await page.goto("/admin/integraciones");
  await expect(page.getByRole("heading", { level: 1, name: "Integraciones" })).toBeVisible();
  await expect(page.getByText("se guardan cifrados")).toBeVisible();

  const card = page.getByRole("region", { name: "TikTok for Business" });
  // Cada proyecto usa un ID distinto (base compartida).
  const advertiser = info.project.name === "escritorio" ? "7000000000000000001" : "7000000000000000002";
  await card.getByRole("button", { name: "Guardar" }).click();
  await expect(card.getByText("Pega aquí el valor.")).toBeVisible();
  await card.getByLabel("ID de la cuenta publicitaria (Advertiser ID)").fill(advertiser);
  await card.getByLabel("Access token de la Marketing API").fill("tt-token-secreto-de-prueba");
  await card.getByRole("button", { name: "Guardar" }).click();
  await expect(card.getByText("Guardado. Ahora toca «Probar conexión».")).toBeVisible();

  await page.reload();
  const again = page.getByRole("region", { name: "TikTok for Business" });
  await expect(again.getByText("Sin probar")).toBeVisible();
  await expect(again.getByLabel("ID de la cuenta publicitaria (Advertiser ID)")).toHaveValue(advertiser);
  const token = again.getByLabel("Access token de la Marketing API");
  await expect(token).toHaveValue(""); // nunca vuelve al navegador
  await expect(token).toHaveAttribute("placeholder", /Guardado/);
  expect(await page.content()).not.toContain("tt-token-secreto-de-prueba");

  // Probar conexión: TikTok rechaza el token de prueba (o no hay red): queda «con error» con su motivo.
  await again.getByRole("button", { name: "Probar conexión" }).click();
  await expect(again.getByRole("alert").first()).toBeVisible({ timeout: 20_000 });
  await noOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-integraciones.png`, fullPage: true });

  page.once("dialog", (d) => d.accept());
  await again.getByRole("button", { name: "Desconectar" }).click();
  await expect(again.getByText("Desconectado.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "TikTok for Business" }).getByText("Sin conectar")).toBeVisible();
});

test("el superadministrador guarda la llave de Claude del asistente; una empresa no entra ahí", async ({ page }) => {
  await login(page, "plataforma@nexora.test");
  await page.goto("/plataforma/integraciones");
  await expect(page.getByRole("heading", { level: 1, name: "Integraciones de la plataforma" })).toBeVisible();
  await page.getByLabel("API key de Anthropic").fill("sk-ant-prueba-e2e");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("API key de Anthropic")).toHaveAttribute("placeholder", /Guardado/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Desconectar" }).click();
  await expect(page.getByText("Desconectado.")).toBeVisible();

  await page.context().clearCookies();
  await login(page, "admin@eltrigal.test");
  await page.goto("/plataforma/integraciones");
  expect(new URL(page.url()).pathname).not.toBe("/plataforma/integraciones");
});
