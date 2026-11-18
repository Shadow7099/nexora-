-- Bandeja de mensajes con IA: conversaciones por cliente y canal (WhatsApp, Messenger, Instagram), mensajes, configuración de la IA, lo que le falta saber y plantillas de WhatsApp.
-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "AiMode" AS ENUM ('SUGGEST', 'AUTO');

-- CreateEnum
CREATE TYPE "AiGapStatus" AS ENUM ('PENDING', 'ANSWERED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED');

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
    "kind" TEXT NOT NULL DEFAULT 'text',
    "status" "MessageStatus" NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'CUSTOMER',
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
    "mode" "AiMode" NOT NULL DEFAULT 'SUGGEST',
    "knowledge" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "escalation" TEXT NOT NULL DEFAULT '',
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
    "status" "AiGapStatus" NOT NULL DEFAULT 'PENDING',
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
    "language" TEXT NOT NULL DEFAULT 'es',
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buttons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
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
