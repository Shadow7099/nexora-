-- Inventario: productos y servicios; movimientos de stock por sede (solo inserción).
-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUST', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE');

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "kind" "ProductKind" NOT NULL DEFAULT 'PRODUCT',
    "unit" TEXT NOT NULL DEFAULT 'UNIDAD',
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
