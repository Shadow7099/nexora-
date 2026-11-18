-- Nexora · cambios pendientes en la base de producción.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez:
-- si una tabla ya existe, no la vuelve a crear.

-- ── 20261111000000_lead ──
DO $migracion$
BEGIN
  IF to_regclass('public.lead') IS NULL THEN
    EXECUTE '-- Solicitudes de negocios interesados desde la página pública.
CREATE TYPE "LeadStatus" AS ENUM (''NEW'', ''CONTACTED'', ''INVITED'', ''DISCARDED'');

CREATE TABLE "lead" (
    "id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "employees" TEXT NOT NULL,
    "sites" INTEGER,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT ''NEW'',
    "ip_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lead_created_at_idx" ON "lead"("created_at");
CREATE INDEX "lead_ip_hash_created_at_idx" ON "lead"("ip_hash", "created_at");

-- Cerrada a la API pública de Supabase como el resto.
ALTER TABLE "lead" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261111000000_lead') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '6ff698dfada15c6fe7c515990a5ce721a03860a8f65c509073fb8788cd8071a1', now(), '20261111000000_lead', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- ── 20261118000000_integration ──
DO $migracion$
BEGIN
  IF to_regclass('public.integration') IS NULL THEN
    EXECUTE '-- Integraciones con servicios externos (Meta, TikTok, WhatsApp, facturación
-- electrónica, correo, Claude). Los tokens van cifrados en "secret_cipher".
CREATE TYPE "IntegrationStatus" AS ENUM (''UNTESTED'', ''CONNECTED'', ''ERROR'');

CREATE TABLE "integration" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT ''{}'',
    "secret_cipher" TEXT,
    "secret_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "IntegrationStatus" NOT NULL DEFAULT ''UNTESTED'',
    "last_error" TEXT,
    "tested_at" TIMESTAMPTZ(3),
    "webhook_token" TEXT NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "integration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "integration_webhook_token_key" ON "integration"("webhook_token");
CREATE UNIQUE INDEX "integration_company_id_provider_key" ON "integration"("company_id", "provider");
-- Una sola conexión de plataforma por proveedor (company_id NULL no la cubre el índice anterior).
CREATE UNIQUE INDEX "integration_platform_provider_key" ON "integration"("provider") WHERE "company_id" IS NULL;

ALTER TABLE "integration" ADD CONSTRAINT "integration_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cerrada a la API pública de Supabase como el resto.
ALTER TABLE "integration" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261118000000_integration') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, 'f7337e98f6dc11d49eedb0275c6fffef7ed35c595f3baf3bd8b5e7da38a6fdb1', now(), '20261118000000_integration', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- Comprobación: debe mostrar las dos tablas.
SELECT to_regclass('public.lead') AS lead, to_regclass('public.integration') AS integration;
