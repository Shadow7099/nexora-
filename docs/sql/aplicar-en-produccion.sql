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

-- ── 20261120000000_cash ──
DO $migracion$
BEGIN
  IF to_regclass('public.cash_movement') IS NULL THEN
    EXECUTE '-- Caja: movimientos de ingreso y egreso por sede y día (se anulan, no se borran) y cierres con arqueo.
-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM (''IN'', ''OUT'');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM (''CASH'', ''TRANSFER'', ''CARD'', ''OTHER'');

-- CreateTable
CREATE TABLE "cash_movement" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "category" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "source_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMPTZ(3),
    "voided_by_id" UUID,
    "void_reason" TEXT,

    CONSTRAINT "cash_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closing" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "opening_balance" DECIMAL(14,2) NOT NULL,
    "cash_in" DECIMAL(14,2) NOT NULL,
    "cash_out" DECIMAL(14,2) NOT NULL,
    "expected" DECIMAL(14,2) NOT NULL,
    "counted" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "totals" JSONB NOT NULL,
    "notes" TEXT,
    "closed_by_id" UUID NOT NULL,
    "closed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reopened_at" TIMESTAMPTZ(3),
    "reopened_by_id" UUID,
    "reopen_reason" TEXT,

    CONSTRAINT "cash_closing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_movement_company_id_site_id_date_idx" ON "cash_movement"("company_id", "site_id", "date");

-- CreateIndex
CREATE INDEX "cash_closing_company_id_site_id_date_idx" ON "cash_closing"("company_id", "site_id", "date");

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_reopened_by_id_fkey" FOREIGN KEY ("reopened_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Un solo cierre vigente por sede y día.
CREATE UNIQUE INDEX "cash_closing_site_date_active_key" ON "cash_closing"("site_id", "date") WHERE "reopened_at" IS NULL;
-- Un origen automático (p. ej. una venta) entra a la caja una sola vez.
CREATE UNIQUE INDEX "cash_movement_source_key" ON "cash_movement"("source", "source_id") WHERE "source" IS NOT NULL AND "voided_at" IS NULL;

ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_counted_nonneg" CHECK ("counted" >= 0);

-- Movimientos: no se borran; de una fila solo se pueden llenar (una vez) los datos de anulación.
CREATE FUNCTION nexora_cash_movement_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '''' AS $$
BEGIN
  IF TG_OP <> ''UPDATE'' THEN
    RAISE EXCEPTION ''Los movimientos de caja no se borran: se anulan con motivo.'';
  END IF;
  IF OLD.voided_at IS NOT NULL OR NEW.voided_at IS NULL OR NEW.void_reason IS NULL
     OR (to_jsonb(NEW) - ARRAY[''voided_at'', ''voided_by_id'', ''void_reason'']) <> (to_jsonb(OLD) - ARRAY[''voided_at'', ''voided_by_id'', ''void_reason'']) THEN
    RAISE EXCEPTION ''Un movimiento de caja solo se puede anular una vez, con motivo; no se edita.'';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cash_movement_guard BEFORE UPDATE OR DELETE ON "cash_movement" FOR EACH ROW EXECUTE FUNCTION nexora_cash_movement_guard();
CREATE TRIGGER cash_movement_no_truncate BEFORE TRUNCATE ON "cash_movement" FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();

-- Cierres: no se borran; de una fila solo se pueden llenar (una vez) los datos de reapertura.
CREATE FUNCTION nexora_cash_closing_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '''' AS $$
BEGIN
  IF TG_OP <> ''UPDATE'' THEN
    RAISE EXCEPTION ''Los cierres de caja no se borran: se reabren con motivo.'';
  END IF;
  IF OLD.reopened_at IS NOT NULL OR NEW.reopened_at IS NULL OR NEW.reopen_reason IS NULL
     OR (to_jsonb(NEW) - ARRAY[''reopened_at'', ''reopened_by_id'', ''reopen_reason'']) <> (to_jsonb(OLD) - ARRAY[''reopened_at'', ''reopened_by_id'', ''reopen_reason'']) THEN
    RAISE EXCEPTION ''Un cierre de caja solo se puede reabrir una vez, con motivo; no se edita.'';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cash_closing_guard BEFORE UPDATE OR DELETE ON "cash_closing" FOR EACH ROW EXECUTE FUNCTION nexora_cash_closing_guard();
CREATE TRIGGER cash_closing_no_truncate BEFORE TRUNCATE ON "cash_closing" FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();

-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "cash_movement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_closing" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261120000000_cash') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, 'fd52743da1fb141da6560c14bb2091ff22bec885f08997d1dbe391360815e78d', now(), '20261120000000_cash', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- ── 20261121000000_sales ──
DO $migracion$
BEGIN
  IF to_regclass('public.sale') IS NULL THEN
    EXECUTE '-- Ventas: clientes, ventas con numeración consecutiva por empresa y sus renglones (no se borran: se anulan).
-- CreateEnum
CREATE TYPE "CustomerDocType" AS ENUM (''NIT'', ''CC'', ''CE'', ''PASAPORTE'', ''PPT'', ''OTRO'');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM (''COMPLETED'', ''VOIDED'');

-- CreateTable
CREATE TABLE "customer" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document_type" "CustomerDocType",
    "document_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT ''COMPLETED'',
    "customer_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_doc" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMPTZ(3),
    "voided_by_id" UUID,
    "void_reason" TEXT,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "sale_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_company_id_name_idx" ON "customer"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_id_company_id_key" ON "customer"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_company_id_document_type_document_number_key" ON "customer"("company_id", "document_type", "document_number");

-- CreateIndex
CREATE INDEX "sale_company_id_date_idx" ON "sale"("company_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sale_company_id_number_key" ON "sale"("company_id", "number");

-- CreateIndex
CREATE INDEX "sale_item_sale_id_idx" ON "sale_item"("sale_id");

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_customer_id_company_id_fkey" FOREIGN KEY ("customer_id", "company_id") REFERENCES "customer"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_product_id_company_id_fkey" FOREIGN KEY ("product_id", "company_id") REFERENCES "product"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Valores coherentes aunque el código fallara.
ALTER TABLE "sale" ADD CONSTRAINT "sale_number_positive" CHECK ("number" > 0);
ALTER TABLE "sale" ADD CONSTRAINT "sale_totals_coherent" CHECK ("subtotal" >= 0 AND "tax_total" >= 0 AND "discount_total" >= 0 AND "total" = "subtotal" + "tax_total");
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_values" CHECK ("quantity" > 0 AND "unit_price" >= 0 AND "discount" >= 0 AND "tax_rate" >= 0 AND "tax_rate" <= 100 AND "total" = "subtotal" + "tax");

-- Ventas: no se borran; de una venta solo se pueden llenar (una vez) los datos de anulación.
CREATE FUNCTION nexora_sale_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '''' AS $$
BEGIN
  IF TG_OP <> ''UPDATE'' THEN
    RAISE EXCEPTION ''Las ventas no se borran: se anulan con motivo.'';
  END IF;
  IF OLD.voided_at IS NOT NULL OR NEW.voided_at IS NULL OR NEW.void_reason IS NULL OR NEW.status <> ''VOIDED''
     OR (to_jsonb(NEW) - ARRAY[''status'', ''voided_at'', ''voided_by_id'', ''void_reason'']) <> (to_jsonb(OLD) - ARRAY[''status'', ''voided_at'', ''voided_by_id'', ''void_reason'']) THEN
    RAISE EXCEPTION ''Una venta solo se puede anular una vez, con motivo; no se edita.'';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sale_guard BEFORE UPDATE OR DELETE ON "sale" FOR EACH ROW EXECUTE FUNCTION nexora_sale_guard();
CREATE TRIGGER sale_no_truncate BEFORE TRUNCATE ON "sale" FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();
-- Los renglones de una venta no cambian nunca.
CREATE TRIGGER sale_item_append_only BEFORE UPDATE OR DELETE ON "sale_item" FOR EACH ROW EXECUTE FUNCTION nexora_forbid_mutation();
CREATE TRIGGER sale_item_no_truncate BEFORE TRUNCATE ON "sale_item" FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();

-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_item" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261121000000_sales') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, 'b40f8dba99a276bcf51059af949dfeccac0d30a35f07f2f0fd45880df8025301', now(), '20261121000000_sales', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- ── 20261122000000_crm ──
DO $migracion$
BEGIN
  IF to_regclass('public.deal') IS NULL THEN
    EXECUTE '-- CRM: datos comerciales del cliente (origen y autorización), oportunidades por etapa y seguimientos.
-- CreateEnum
CREATE TYPE "DealStage" AS ENUM (''NEW'', ''CONTACTED'', ''PROPOSAL'', ''NEGOTIATION'', ''WON'', ''LOST'');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM (''NOTE'', ''CALL'', ''WHATSAPP'', ''EMAIL'', ''MEETING'', ''TASK'', ''STAGE'', ''LEAD'');

-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "consent_at" TIMESTAMPTZ(3),
ADD COLUMN     "consent_source" TEXT,
ADD COLUMN     "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT ''MANUAL'';

-- CreateTable
CREATE TABLE "deal" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(14,2),
    "stage" "DealStage" NOT NULL DEFAULT ''NEW'',
    "source" TEXT NOT NULL DEFAULT ''MANUAL'',
    "owner_id" UUID,
    "expected_close" DATE,
    "lost_reason" TEXT,
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activity" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "deal_id" UUID,
    "type" "CrmActivityType" NOT NULL,
    "body" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(3),
    "done_at" TIMESTAMPTZ(3),
    "external_id" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_company_id_stage_idx" ON "deal"("company_id", "stage");

-- CreateIndex
CREATE INDEX "deal_company_id_customer_id_idx" ON "deal"("company_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_id_company_id_key" ON "deal"("id", "company_id");

-- CreateIndex
CREATE INDEX "crm_activity_company_id_customer_id_created_at_idx" ON "crm_activity"("company_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "crm_activity_company_id_due_at_idx" ON "crm_activity"("company_id", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_activity_company_id_external_id_key" ON "crm_activity"("company_id", "external_id");

-- CreateIndex
CREATE INDEX "customer_company_id_phone_idx" ON "customer"("company_id", "phone");

-- CreateIndex
CREATE INDEX "customer_company_id_email_idx" ON "customer"("company_id", "email");

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_customer_id_company_id_fkey" FOREIGN KEY ("customer_id", "company_id") REFERENCES "customer"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_customer_id_company_id_fkey" FOREIGN KEY ("customer_id", "company_id") REFERENCES "customer"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_deal_id_company_id_fkey" FOREIGN KEY ("deal_id", "company_id") REFERENCES "deal"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "deal" ADD CONSTRAINT "deal_value_nonneg" CHECK ("value" IS NULL OR "value" >= 0);

-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_activity" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261122000000_crm') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '592fd812257f1ab4a090c6d002798f0ee907aae2a7e7c294ec3e93751c05d10e', now(), '20261122000000_crm', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- ── 20261123000000_messages ──
DO $migracion$
BEGIN
  IF to_regclass('public.conversation') IS NULL THEN
    EXECUTE '-- Bandeja de mensajes con IA: conversaciones por cliente y canal (WhatsApp, Messenger, Instagram), mensajes, configuración de la IA, lo que le falta saber y plantillas de WhatsApp.
-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM (''WHATSAPP'', ''MESSENGER'', ''INSTAGRAM'');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM (''IN'', ''OUT'');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM (''RECEIVED'', ''SENT'', ''DELIVERED'', ''READ'', ''FAILED'');

-- CreateEnum
CREATE TYPE "AiMode" AS ENUM (''SUGGEST'', ''AUTO'');

-- CreateEnum
CREATE TYPE "AiGapStatus" AS ENUM (''PENDING'', ''ANSWERED'', ''DISMISSED'');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM (''DRAFT'', ''PENDING'', ''APPROVED'', ''REJECTED'', ''PAUSED'', ''DISABLED'');

-- CreateTable
CREATE TABLE "conversation" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "external_user" TEXT NOT NULL,
    "last_message_at" TIMESTAMPTZ(3) NOT NULL,
    "last_inbound_at" TIMESTAMPTZ(3),
    "last_preview" TEXT,
    "unread" INTEGER NOT NULL DEFAULT 0,
    "ai_tag" TEXT,
    "ai_summary" TEXT,
    "ai_suggestion" TEXT,
    "needs_human" BOOLEAN NOT NULL DEFAULT false,
    "human_reason" TEXT,
    "ai_at" TIMESTAMPTZ(3),
    "ai_error" TEXT,
    "ai_paused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT ''text'',
    "status" "MessageStatus" NOT NULL,
    "origin" TEXT NOT NULL DEFAULT ''CUSTOMER'',
    "error" TEXT,
    "external_id" TEXT,
    "sent_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_ai_config" (
    "company_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "AiMode" NOT NULL DEFAULT ''SUGGEST'',
    "knowledge" TEXT NOT NULL DEFAULT '''',
    "instructions" TEXT NOT NULL DEFAULT '''',
    "escalation" TEXT NOT NULL DEFAULT '''',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crm_ai_config_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "ai_gap" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "missing" TEXT NOT NULL,
    "question" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" "AiGapStatus" NOT NULL DEFAULT ''PENDING'',
    "answer" TEXT,
    "last_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_gap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_template" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT ''es'',
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buttons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TemplateStatus" NOT NULL DEFAULT ''DRAFT'',
    "meta_id" TEXT,
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wa_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_company_id_last_message_at_idx" ON "conversation"("company_id", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_id_company_id_key" ON "conversation"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_company_id_channel_external_user_key" ON "conversation"("company_id", "channel", "external_user");

-- CreateIndex
CREATE INDEX "message_conversation_id_created_at_idx" ON "message"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_company_id_external_id_key" ON "message"("company_id", "external_id");

-- CreateIndex
CREATE INDEX "ai_gap_company_id_status_idx" ON "ai_gap"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_gap_company_id_missing_key" ON "ai_gap"("company_id", "missing");

-- CreateIndex
CREATE UNIQUE INDEX "wa_template_company_id_name_language_key" ON "wa_template"("company_id", "name", "language");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_customer_id_company_id_fkey" FOREIGN KEY ("customer_id", "company_id") REFERENCES "customer"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_company_id_fkey" FOREIGN KEY ("conversation_id", "company_id") REFERENCES "conversation"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ai_config" ADD CONSTRAINT "crm_ai_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_gap" ADD CONSTRAINT "ai_gap_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_template" ADD CONSTRAINT "wa_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "conversation" ADD CONSTRAINT "conversation_unread_nonneg" CHECK ("unread" >= 0);

-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_ai_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_gap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wa_template" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261123000000_messages') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '747dfc1062ebd1ec3fdfa466ca642ee324e5ba3cd5c11bdc33c86e257d84fa07', now(), '20261123000000_messages', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- ── 20261124000000_activation ──
DO $migracion$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261124000000_activation') THEN
    EXECUTE '-- CreateTable
CREATE TABLE "activation_code" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey_login" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkey_login_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activation_code_code_hash_key" ON "activation_code"("code_hash");

-- CreateIndex
CREATE INDEX "activation_code_employee_id_idx" ON "activation_code"("employee_id");

-- CreateIndex
CREATE INDEX "passkey_login_expires_at_idx" ON "passkey_login"("expires_at");

-- AddForeignKey
ALTER TABLE "activation_code" ADD CONSTRAINT "activation_code_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_code" ADD CONSTRAINT "activation_code_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "activation_code" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passkey_login" ENABLE ROW LEVEL SECURITY;
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261124000000_activation') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '82bac27f310f335c16c4d20cdd472c2148d8948780e13e61ad7587986861c619', now(), '20261124000000_activation', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- ── 20261125000000_access_code ──
DO $migracion$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261125000000_access_code') THEN
    EXECUTE '-- DropForeignKey
ALTER TABLE "activation_code" DROP CONSTRAINT "activation_code_company_id_fkey";

-- DropForeignKey
ALTER TABLE "activation_code" DROP CONSTRAINT "activation_code_employee_id_company_id_fkey";

-- AlterTable
ALTER TABLE "employee" ADD COLUMN     "access_code_enc" TEXT,
ADD COLUMN     "access_code_hash" TEXT,
ADD COLUMN     "require_passkey" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "activation_code";

-- CreateIndex
CREATE UNIQUE INDEX "employee_access_code_hash_key" ON "employee"("access_code_hash");

';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261125000000_access_code') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, 'a6f3ed5617cadd66336d408b75869b2833a1f36407c2c870578ccc1fe53d6e71', now(), '20261125000000_access_code', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- ── 20261126000000_crm_ads_comments ──
DO $migracion$
BEGIN
  IF to_regclass('public.social_comment') IS NULL THEN
    EXECUTE '-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "ad_at" TIMESTAMPTZ(3),
ADD COLUMN     "ad_id" TEXT,
ADD COLUMN     "ad_source_type" TEXT,
ADD COLUMN     "ad_title" TEXT,
ADD COLUMN     "ad_url" TEXT,
ADD COLUMN     "demo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "social_comment" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "post_id" TEXT,
    "post_text" TEXT,
    "post_url" TEXT,
    "author_id" TEXT,
    "author_name" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT ''PENDING'',
    "ai_type" TEXT,
    "ai_suggestion" TEXT,
    "ai_private" TEXT,
    "ai_error" TEXT,
    "reply" TEXT,
    "replied_at" TIMESTAMPTZ(3),
    "replied_by_id" UUID,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "posted_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_comment_company_id_status_posted_at_idx" ON "social_comment"("company_id", "status", "posted_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_comment_company_id_external_id_key" ON "social_comment"("company_id", "external_id");

-- CreateIndex
CREATE INDEX "conversation_company_id_ad_id_idx" ON "conversation"("company_id", "ad_id");

-- AddForeignKey
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Cerrada a la API pública de Supabase como el resto.
ALTER TABLE "social_comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_status_check" CHECK ("status" IN (''PENDING'', ''REPLIED'', ''PRIVATE'', ''IGNORED''));
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_channel_check" CHECK ("channel" IN (''FACEBOOK'', ''INSTAGRAM''));
';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261126000000_crm_ads_comments') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '1c202081f91ac2506f980e2f3d57bf31aefac3c19a3d0a36b6beb02348b769c2', now(), '20261126000000_crm_ads_comments', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

-- Comprobación: debe mostrar todas las tablas.
SELECT to_regclass('public.lead') AS lead, to_regclass('public.integration') AS integration, to_regclass('public.product') AS product, to_regclass('public.cash_movement') AS cash_movement, to_regclass('public.sale') AS sale, to_regclass('public.deal') AS deal, to_regclass('public.conversation') AS conversation, to_regclass('public.social_comment') AS social_comment,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'employee' AND column_name = 'access_code_hash') AS codigo_acceso;
