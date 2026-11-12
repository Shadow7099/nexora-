/**
 * Marcación de punta a punta en el navegador: QR → ingreso → vincular celular →
 * ubicación → entrada y salida; fuera del área; passkey; celular nuevo pendiente.
 * La ubicación se simula con la geolocalización de Playwright y la huella con el
 * autenticador virtual de Chrome (WebAuthn por CDP).
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";

const DEMO_PASSWORD = "Nexora-Demo-2026";
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://nexora:nexora@localhost:5432/nexora_e2e_test";
const CENTRO = { latitude: 4.142, longitude: -73.6266, accuracy: 12 };
const FAR = { latitude: 4.152, longitude: -73.6266, accuracy: 12 }; // ~1,1 km al norte

// Cada proyecto usa empleados distintos para no interferir entre sí.
const PEOPLE = {
  escritorio: { punch: "juan", far: "laura", passkey: "andres", devices: "paula" },
  celular: { punch: "camila", far: "santiago", passkey: "valentina", devices: "diego" },
} as const;

async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []) {
  const c = new Client({ connectionString: E2E_DB });
  await c.connect();
  try {
    return (await c.query(query, params)).rows as T[];
  } finally {
    await c.end();
  }
}

let qrCentro = "";
test.beforeAll(async () => {
  const [row] = await sql<{ public_code: string }>(
    `SELECT q.public_code FROM site_qr_code q JOIN site s ON s.id = q.site_id WHERE s.name = 'Villavicencio Centro' AND q.revoked_at IS NULL`,
  );
  qrCentro = row!.public_code;
});

test.use({ geolocation: CENTRO, permissions: ["geolocation"] });

async function login(page: Page, user: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(`${user}@eltrigal.test`);
  await page.getByLabel("Contraseña").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Autorización/);
  }
}

async function bindThisPhone(page: Page) {
  await page.goto(`/m/${qrCentro}`);
  await page.getByRole("button", { name: "Vincular este celular" }).click();
  await expect(page.getByRole("button", { name: /Registrar (entrada|salida)/ })).toBeVisible();
}

async function addVirtualAuthenticator(context: BrowserContext, page: Page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true },
  });
}

test("escanear el QR sin sesión lleva al ingreso y luego de vuelta al QR", async ({ page }, info) => {
  const who = PEOPLE[info.project.name as keyof typeof PEOPLE].punch;
  await page.goto(`/m/${qrCentro}`);
  await expect(page).toHaveURL(new RegExp(`/ingresar\\?next=%2Fm%2F${qrCentro}`));
  await page.getByLabel("Correo").fill(`${who}@eltrigal.test`);
  await page.getByLabel("Contraseña").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  // Si es su primer ingreso, acepta la autorización de datos; en ambos casos vuelve a la página del QR.
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ingresar");
  if (new URL(page.url()).pathname === "/autorizacion") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  }
  await expect(page).toHaveURL(new RegExp(`/m/${qrCentro}$`));
  await expect(page.getByText("Villavicencio Centro")).toBeVisible();
});

test("entrada y salida desde el QR, con la hora del servidor y sin duplicados", async ({ page }, info) => {
  const who = PEOPLE[info.project.name as keyof typeof PEOPLE].punch;
  await login(page, who);
  await bindThisPhone(page);

  await page.screenshot({ path: `test-results/shots/${info.project.name}-qr-antes.png`, fullPage: true });
  await page.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(page.getByText("Entrada registrada")).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-qr-entrada.png`, fullPage: true });
  await expect(page.getByTestId("punch-time")).toHaveText(/\d{1,2}:\d{2} [ap]\. m\./);

  // Al volver al QR, ahora ofrece la salida; marcar de inmediato se rechaza como duplicado.
  await page.goto(`/m/${qrCentro}`);
  await page.getByRole("button", { name: "Registrar salida" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "hace un momento" })).toBeVisible();

  const [row] = await sql<{ n: string }>(
    `SELECT count(*) AS n FROM work_session w JOIN employee e ON e.id = w.employee_id JOIN app_user u ON u.id = e.user_id
     WHERE u.email = $1 AND w.status = 'OPEN'`,
    [`${who}@eltrigal.test`],
  );
  expect(Number(row!.n)).toBe(1);

  // El inicio del empleado refleja la jornada abierta.
  await page.goto("/app");
  await expect(page.getByText(/En jornada desde/)).toBeVisible();
});

test("fuera del área de la sede: rechazada y visible para el administrador", async ({ page, context, browser }, info) => {
  const who = PEOPLE[info.project.name as keyof typeof PEOPLE].far;
  await login(page, who);
  await bindThisPhone(page);
  await context.setGeolocation(FAR);
  await page.getByRole("button", { name: /Registrar (entrada|salida)/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "fuera del área" })).toBeVisible();

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, "admin");
  await admin.goto("/admin/asistencia");
  await expect(admin.getByText(/Fuera del área de la sede.*a \d{3,4} m/).first()).toBeVisible();
  await admin.screenshot({ path: `test-results/shots/${info.project.name}-admin-asistencia.png`, fullPage: true });
  await adminCtx.close();
});

test("con huella activada, la marcación se confirma con passkey", async ({ page, context }, info) => {
  const who = PEOPLE[info.project.name as keyof typeof PEOPLE].passkey;
  await addVirtualAuthenticator(context, page);
  await login(page, who);
  await bindThisPhone(page);

  await page.goto("/app");
  await page.getByRole("button", { name: "Activar huella" }).click();
  await expect(page.getByText("Huella activada")).toBeVisible();

  await page.goto(`/m/${qrCentro}`);
  await expect(page.getByText("Te pediremos tu huella o rostro")).toBeVisible();
  await page.getByRole("button", { name: /Registrar (entrada|salida)/ }).click();
  await expect(page.getByText(/(Entrada|Salida) registrada/)).toBeVisible();

  const [ev] = await sql<{ verification: string }>(
    `SELECT a.verification FROM attendance_event a JOIN employee e ON e.id = a.employee_id JOIN app_user u ON u.id = e.user_id
     WHERE u.email = $1 AND a.source = 'QR' ORDER BY a.occurred_at DESC LIMIT 1`,
    [`${who}@eltrigal.test`],
  );
  expect(ev!.verification).toBe("PASSKEY");

  // El navegador olvida el celular (en iPhone pasa al alternar Safari y el ícono de inicio):
  // se reconoce con la misma huella, sin crear un celular pendiente de aprobación.
  await context.clearCookies({ name: /nexora_device/ });
  await page.goto(`/m/${qrCentro}`);
  await expect(page.getByText("Confirma que es tu celular")).toBeVisible();
  await page.getByRole("button", { name: "Reconocer este celular con mi huella" }).click();
  await expect(page.getByRole("button", { name: /Registrar (entrada|salida)/ })).toBeVisible();
  await expect(page.getByText("Te pediremos tu huella o rostro")).toBeVisible();
  const bindings = await sql<{ status: string }>(
    `SELECT d.status FROM device_binding d JOIN employee e ON e.id = d.employee_id JOIN app_user u ON u.id = e.user_id WHERE u.email = $1`,
    [`${who}@eltrigal.test`],
  );
  expect(bindings.map((b) => b.status)).toEqual(["ACTIVE"]);
});

test("un celular nuevo queda pendiente hasta que el administrador lo aprueba", async ({ browser, page }, info) => {
  test.setTimeout(60_000);
  const who = PEOPLE[info.project.name as keyof typeof PEOPLE].devices;
  // Primer celular: queda activo de inmediato.
  await login(page, who);
  await bindThisPhone(page);

  // Segundo celular (otro navegador = otro dispositivo): queda pendiente.
  const phone2 = await browser.newContext({ geolocation: CENTRO, permissions: ["geolocation"] });
  const p2 = await phone2.newPage();
  await login(p2, who);
  await p2.goto(`/m/${qrCentro}`);
  // Explica que puede ser la ventana de la cámara y ofrece vincularlo como celular nuevo.
  await expect(p2.getByText("Esta ventana no reconoce tu celular")).toBeVisible();
  await p2.getByRole("button", { name: "Vincular como celular nuevo" }).click();
  await expect(p2.getByText("Celular pendiente de aprobación")).toBeVisible();

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, "admin");
  await admin.goto("/admin/asistencia");
  await admin.locator("li", { hasText: new RegExp(`^${who}`, "i") }).getByRole("button", { name: "Aprobar" }).click();
  await expect(admin.getByText("Celular aprobado.")).toBeVisible();

  // Aprobado el nuevo, el nuevo marca y el anterior queda desvinculado.
  await p2.reload();
  await expect(p2.getByRole("button", { name: /Registrar (entrada|salida)/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Este celular fue desvinculado")).toBeVisible();
  await phone2.close();
  await adminCtx.close();
});

test("desde el inicio del empleado, «Marcar entrada» abre la cámara, lee el QR de la sede y lleva a la marcación", async ({ playwright }, info) => {
  test.skip(info.project.name !== "escritorio", "Usa su propio navegador con cámara simulada");
  // Video falso de la cámara: el QR real de la sede (como el impreso en la entrada).
  // Ruta sin tildes ni espacios: Chromium no abre el video falso si la ruta los tiene.
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(`${tmpdir()}/nexora-camara-`);
  const { execFileSync } = await import("node:child_process");
  const QRCode = (await import("qrcode")).default;
  await QRCode.toFile(`${dir}/qr.png`, `https://asistencia.ejemplo.co/m/${qrCentro}`, { width: 480, margin: 4 });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", `${dir}/qr.png`, "-vf", "pad=640:480:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p", "-t", "2", "-r", "10", `${dir}/qr.y4m`]);

  const browser = await playwright.chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${dir}/qr.y4m`],
  });
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, geolocation: CENTRO, permissions: ["geolocation", "camera"] });
  const page = await context.newPage();
  try {
    await login(page, "laura");
    await page.goto("/app");
    await page.getByRole("button", { name: /Marcar (entrada|salida)/ }).click();
    await expect(page.getByRole("dialog", { name: /escanear el QR de la sede/ })).toBeVisible();
    // Lee el QR y abre la marcación en ESTE sitio (aunque el QR traiga otro dominio).
    await page.waitForURL(new RegExp(`/m/${qrCentro}$`), { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Vincular (este celular|como celular nuevo)|Registrar (entrada|salida)/ })).toBeVisible();
  } catch (e) {
    await page.screenshot({ path: test.info().outputPath("camara.png") }).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
});
