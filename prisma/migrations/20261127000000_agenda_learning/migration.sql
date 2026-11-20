-- AlterTable
ALTER TABLE "crm_ai_config" ADD COLUMN     "auto_learn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "booking_site_id" UUID,
ADD COLUMN     "last_learn_at" TIMESTAMPTZ(3),
ADD COLUMN     "slot_capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "slot_minutes" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "buttons" JSONB;

-- CreateTable
CREATE TABLE "appointment" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "site_id" UUID,
    "conversation_id" UUID,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_ai_version" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "knowledge" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "escalation" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT,
    "metrics" JSONB,
    "changes" JSONB,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_ai_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_company_id_starts_at_idx" ON "appointment"("company_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointment_company_id_customer_id_idx" ON "appointment"("company_id", "customer_id");

-- CreateIndex
CREATE INDEX "crm_ai_version_company_id_created_at_idx" ON "crm_ai_version"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_customer_id_company_id_fkey" FOREIGN KEY ("customer_id", "company_id") REFERENCES "customer"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ai_version" ADD CONSTRAINT "crm_ai_version_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "appointment" ADD CONSTRAINT "appointment_status_check" CHECK ("status" IN ('BOOKED', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELLED'));
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_duration_check" CHECK ("duration_min" BETWEEN 5 AND 600);
ALTER TABLE "crm_ai_config" ADD CONSTRAINT "crm_ai_config_slots_check" CHECK ("slot_minutes" BETWEEN 10 AND 480 AND "slot_capacity" BETWEEN 1 AND 50);

-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_ai_version" ENABLE ROW LEVEL SECURITY;
