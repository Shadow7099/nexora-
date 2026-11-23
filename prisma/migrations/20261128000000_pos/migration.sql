-- AlterTable
ALTER TABLE "product" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "pos_category_id" UUID,
ADD COLUMN     "pos_group" TEXT,
ADD COLUMN     "variant_color" TEXT,
ADD COLUMN     "variant_hex" TEXT,
ADD COLUMN     "variant_size" TEXT;

-- CreateTable
CREATE TABLE "pos_category" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "icon" TEXT NOT NULL DEFAULT 'box',
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_category_company_id_parent_id_idx" ON "pos_category"("company_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_category_id_company_id_key" ON "pos_category"("id", "company_id");

-- CreateIndex
CREATE INDEX "product_company_id_pos_category_id_idx" ON "product"("company_id", "pos_category_id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_pos_category_id_company_id_fkey" FOREIGN KEY ("pos_category_id", "company_id") REFERENCES "pos_category"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_category" ADD CONSTRAINT "pos_category_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_category" ADD CONSTRAINT "pos_category_parent_id_company_id_fkey" FOREIGN KEY ("parent_id", "company_id") REFERENCES "pos_category"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "pos_category" ADD CONSTRAINT "pos_category_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE "product" ADD CONSTRAINT "product_variant_hex_check" CHECK ("variant_hex" IS NULL OR "variant_hex" ~ '^#[0-9A-Fa-f]{6}$');

-- Cerrada a la API pública de Supabase como el resto.
ALTER TABLE "pos_category" ENABLE ROW LEVEL SECURITY;
