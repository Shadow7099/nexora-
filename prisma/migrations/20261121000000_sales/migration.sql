-- Ventas: clientes, ventas con numeración consecutiva por empresa y sus renglones (no se borran: se anulan).
-- CreateEnum
CREATE TYPE "CustomerDocType" AS ENUM ('NIT', 'CC', 'CE', 'PASAPORTE', 'PPT', 'OTRO');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'VOIDED');

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
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
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
CREATE FUNCTION nexora_sale_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'Las ventas no se borran: se anulan con motivo.';
  END IF;
  IF OLD.voided_at IS NOT NULL OR NEW.voided_at IS NULL OR NEW.void_reason IS NULL OR NEW.status <> 'VOIDED'
     OR (to_jsonb(NEW) - ARRAY['status', 'voided_at', 'voided_by_id', 'void_reason']) <> (to_jsonb(OLD) - ARRAY['status', 'voided_at', 'voided_by_id', 'void_reason']) THEN
    RAISE EXCEPTION 'Una venta solo se puede anular una vez, con motivo; no se edita.';
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
