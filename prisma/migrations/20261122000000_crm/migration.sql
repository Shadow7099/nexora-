-- CRM: datos comerciales del cliente (origen y autorización), oportunidades por etapa y seguimientos.
-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('NOTE', 'CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'TASK', 'STAGE', 'LEAD');

-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "consent_at" TIMESTAMPTZ(3),
ADD COLUMN     "consent_source" TEXT,
ADD COLUMN     "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "deal" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(14,2),
    "stage" "DealStage" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
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
