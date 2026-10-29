import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", heading: /Control inteligente/ },
  { path: "/sistema", heading: "Sistema de diseño" },
  { path: "/sistema/admin", heading: "Resumen" },
  { path: "/sistema/empleado", heading: "Hola, Juan." },
];

for (const { path, heading } of pages) {
  test(`${path} carga sin errores y sin desbordar horizontalmente`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "la página no debe tener scroll horizontal").toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("el selector de tema cambia entre claro y oscuro", async ({ page }) => {
  await page.goto("/sistema");
  await page.getByRole("radio", { name: "Oscuro" }).first().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Claro" }).first().click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("las secciones de fases futuras no se presentan como enlaces", async ({ page, isMobile }) => {
  await page.goto("/sistema/admin");
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  const nav = page.getByRole("navigation", { name: "Principal" }).last();
  await expect(nav.getByRole("link", { name: "Pre-nómina" })).toHaveCount(0);
  await expect(nav.getByText("Pre-nómina")).toBeVisible();
});

test("cabeceras de seguridad presentes", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["permissions-policy"]).toContain("geolocation=(self)");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});

// Capturas para revisión visual (no son aserciones).
test("capturas de revisión", async ({ page }, info) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const path of ["/sistema/admin", "/sistema/empleado"]) {
      await page.goto(path);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/shots/${info.project.name}-${theme}${path.replaceAll("/", "-")}.png`, fullPage: true });
    }
  }
});

test("una ruta inexistente muestra la página 404 en español", async ({ page }) => {
  const res = await page.goto("/no-existe-esta-ruta");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Esta página no existe" })).toBeVisible();
});
