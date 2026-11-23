-- Nexora · Punto de venta (POS). Se puede ejecutar más de una vez.
DO $migracion$
BEGIN
  ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
  ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "pos_category_id" UUID;
  ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "pos_group" TEXT;
  ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "variant_color" TEXT;
  ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "variant_hex" TEXT;
  ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "variant_size" TEXT;
  IF to_regclass('public.pos_category') IS NULL THEN
    CREATE TABLE "pos_category" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "parent_id" UUID, "name" TEXT NOT NULL, "color" TEXT NOT NULL DEFAULT '#6366F1', "icon" TEXT NOT NULL DEFAULT 'box', "image_url" TEXT, "sort_order" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "pos_category_pkey" PRIMARY KEY ("id"));
    CREATE INDEX "pos_category_company_id_parent_id_idx" ON "pos_category"("company_id", "parent_id");
    CREATE UNIQUE INDEX "pos_category_id_company_id_key" ON "pos_category"("id", "company_id");
    ALTER TABLE "pos_category" ADD CONSTRAINT "pos_category_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "pos_category" ADD CONSTRAINT "pos_category_parent_id_company_id_fkey" FOREIGN KEY ("parent_id", "company_id") REFERENCES "pos_category"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "pos_category" ADD CONSTRAINT "pos_category_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$');
    ALTER TABLE "pos_category" ENABLE ROW LEVEL SECURITY;
  END IF;
  CREATE INDEX IF NOT EXISTS "product_company_id_pos_category_id_idx" ON "product"("company_id", "pos_category_id");
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_pos_category_id_company_id_fkey') THEN
    ALTER TABLE "product" ADD CONSTRAINT "product_pos_category_id_company_id_fkey" FOREIGN KEY ("pos_category_id", "company_id") REFERENCES "pos_category"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variant_hex_check') THEN
    ALTER TABLE "product" ADD CONSTRAINT "product_variant_hex_check" CHECK ("variant_hex" IS NULL OR "variant_hex" ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261128000000_pos') THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, '9aca697d5589d9c5513b147710ce6e4c3a1180bd6a410326bfdd371543778692', now(), '20261128000000_pos', NULL, NULL, now(), 1);
  END IF;
END
$migracion$;

SELECT to_regclass('public.pos_category') AS punto_de_venta,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'product' AND column_name = 'variant_hex') AS variantes;
