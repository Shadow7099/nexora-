import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
// Debe coincidir con tests/support/test-db.ts (usado por global-setup).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://nexora:nexora@localhost:5432/nexora_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: "test" },
    // Las pruebas de BD comparten la misma base; se ejecutan en serie.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
