import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Base exclusiva de las pruebas de navegador (se recrea con la demo en cada ejecución).
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://nexora:nexora@localhost:5432/nexora_e2e_test";
// Permite usar un Chromium ya instalado (p. ej. en CI o contenedores) en lugar de descargarlo.
const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  reporter: [["list"]],
  // En serie: las pruebas comparten la base (inicios de sesión, bloqueos, empleados creados).
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", launchOptions },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `tsx scripts/e2e-db.ts && npm run start -- -p ${PORT}`,
    env: { DATABASE_URL: E2E_DATABASE_URL },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
