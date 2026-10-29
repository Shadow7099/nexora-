/**
 * Base de datos exclusiva para pruebas: se borra y se vuelve a crear en cada
 * ejecución y se le aplican todas las migraciones. Nunca toca la base real.
 */
import { execSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "./test-db";

export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`Por seguridad, la base de pruebas debe terminar en "_test" (recibido: ${name})`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();

  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "pipe" });
}
