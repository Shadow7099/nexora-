/**
 * Prepara la base de datos de las pruebas de navegador: la borra, la crea,
 * aplica las migraciones y carga la empresa demo. Solo acepta nombres que
 * terminen en "_test" para no tocar nunca una base real.
 */
import { execSync } from "node:child_process";
import { Client } from "pg";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const name = url.pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`La base de pruebas debe terminar en "_test" (recibido: "${name}")`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();

  const env = { ...process.env, DATABASE_URL: url.toString() };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx prisma db seed", { env, stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
