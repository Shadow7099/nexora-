/**
 * Al publicar en Vercel (producción), activa en la base de datos las
 * actualizaciones pendientes de Nexora ejecutando docs/sql/aplicar-en-produccion.sql:
 * cada bloque solo crea lo que falta y registra su migración, así que se
 * puede ejecutar en cada despliegue. Fuera de producción no hace nada.
 * Si algo falla, lo explica en el registro del build y deja seguir el
 * despliegue (los módulos afectados muestran «se está activando»).
 */
import { readFileSync } from "node:fs";
import pg from "pg";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migraciones] No es producción de Vercel: no se toca la base.");
  process.exit(0);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("[migraciones] Falta DATABASE_URL en el build: no se aplicaron actualizaciones.");
  process.exit(0);
}

const sql = readFileSync(new URL("../docs/sql/aplicar-en-produccion.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const before = await client.query(`SELECT count(*)::int AS n FROM "_prisma_migrations"`).catch(() => ({ rows: [{ n: null }] }));
  await client.query(sql);
  const after = await client.query(`SELECT count(*)::int AS n FROM "_prisma_migrations"`);
  const tables = await client.query(`SELECT to_regclass('public.pos_category') IS NOT NULL AS pos, to_regclass('public.appointment') IS NOT NULL AS agenda, to_regclass('public.conversation') IS NOT NULL AS mensajes`);
  console.log(`[migraciones] Base al día: ${before.rows[0].n ?? "?"} → ${after.rows[0].n} migraciones registradas. Módulos: ${JSON.stringify(tables.rows[0])}`);
} catch (e) {
  // Solo el mensaje de Postgres (sin la dirección de la base ni credenciales).
  console.warn(`[migraciones] No se pudieron aplicar: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  await client.end().catch(() => {});
}
