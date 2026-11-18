-- Nexora · cambios pendientes en la base de producción.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez:
-- si una tabla ya existe, no la vuelve a crear.
-- (Generado con scripts/sql-produccion.py)

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

-- ── 20261119000000_inventory ──
DO $migracion$
BEGIN
  IF to_regclass('public.product') IS NULL THEN
    EXECUTE '-- Inventario: productos y servicios; movimientos de stock por sede (solo inserción).
-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM (''PRODUCT'', ''SERVICE'');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM (''IN'', ''OUT'', ''ADJUST'', ''TRANSFER_OUT'', ''TRANSFER_IN'', ''SALE'');

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "kind" "ProductKind" NOT NULL DEFAULT ''PRODUCT'',
    "unit" TEXT NOT NULL DEFAULT ''UNIDAD'',
    "price" DECIMAL(14,2) NOT NULL,
    "cost" DECIMAL(14,2),
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,2),
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "transfer_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_company_id_active_idx" ON "product"("company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "product_id_company_id_key" ON "product"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_company_id_sku_key" ON "product"("company_id", "sku");

-- CreateIndex
CREATE INDEX "stock_movement_company_id_product_id_site_id_idx" ON "stock_movement"("company_id", "product_id", "site_id");

-- CreateIndex
CREATE INDEX "stock_movement_company_id_created_at_idx" ON "stock_movement"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_company_id_fkey" FOREIGN KEY ("product_id", "company_id") REFERENCES "product"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Movimientos de solo inserción: una corrección es un movimiento nuevo.
CREATE TRIGGER stock_movement_append_only
  BEFORE UPDATE OR DELETE ON "stock_movement"
  FOR EACH ROW EXECUTE FUNCTION nexora_forbid_mutation();
CREATE TRIGGER stock_movement_no_truncate
  BEFORE TRUNCATE ON "stock_movement"
  FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();

-- Datos coherentes aunque el código fallara.
ALTER TABLE "product" ADD CONSTRAINT "product_price_nonneg" CHECK ("price" >= 0 AND ("cost" IS NULL OR "cost" >= 0));
ALTER TABLE "product" ADD CONSTRAINT "product_tax_rate_range" CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100);
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_quantity_nonzero" CHECK ("quantity" <> 0);

-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movement" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261119000000_inventory') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '10834226264ed19ff5825fcd2145fcc3d81c60316f6fa1e34e89976423317487', now(), '20261119000000_inventory', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- Comprobación: debe mostrar todas las tablas.
SELECT to_regclass('public.lead') AS lead, to_regclass('public.integration') AS integration, to_regclass('public.product') AS product;
