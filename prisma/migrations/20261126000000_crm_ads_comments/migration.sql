-- AlterTable
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
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_status_check" CHECK ("status" IN ('PENDING', 'REPLIED', 'PRIVATE', 'IGNORED'));
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_channel_check" CHECK ("channel" IN ('FACEBOOK', 'INSTAGRAM'));
