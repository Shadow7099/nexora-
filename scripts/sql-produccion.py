"""Genera docs/sql/aplicar-en-produccion.sql con las migraciones pendientes en producción.

Uso: python3 scripts/sql-produccion.py
Cada bloque crea las tablas solo si no existen y registra la migración en
_prisma_migrations con su suma sha256, como lo haría `prisma migrate deploy`.
"""
import hashlib
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
# (migración, tabla que indica si ya está aplicada)
PENDING = [
    ("20261111000000_lead", "lead"),
    ("20261118000000_integration", "integration"),
    ("20261119000000_inventory", "product"),
    ("20261120000000_cash", "cash_movement"),
    ("20261121000000_sales", "sale"),
    ("20261122000000_crm", "deal"),
    ("20261123000000_messages", "conversation"),
]

def block(name: str, table: str) -> str:
    raw = (ROOT / "prisma" / "migrations" / name / "migration.sql").read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    body = raw.decode("utf-8").replace("'", "''")
    return f"""-- ── {name} ──
DO $migracion$
BEGIN
  IF to_regclass('public.{table}') IS NULL THEN
    EXECUTE '{body}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '{name}') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '{checksum}', now(), '{name}', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;
"""

out = """-- Nexora · cambios pendientes en la base de producción.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez:
-- si una tabla ya existe, no la vuelve a crear.
-- (Generado con scripts/sql-produccion.py)

""" + "\n".join(block(n, t) for n, t in PENDING) + """
-- Comprobación: debe mostrar todas las tablas.
SELECT """ + ", ".join(f"to_regclass('public.{t}') AS {t}" for _, t in PENDING) + ";\n"
(ROOT / "docs" / "sql" / "aplicar-en-produccion.sql").write_text(out, encoding="utf-8")
print("docs/sql/aplicar-en-produccion.sql:", ", ".join(n for n, _ in PENDING))
