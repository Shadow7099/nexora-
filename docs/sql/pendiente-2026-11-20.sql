-- Nexora · cambios pendientes (código de empleados, ingreso con Face ID, anuncios,
-- comentarios de redes, agenda y aprendizaje de la IA). Se puede ejecutar más de una vez.
DO $migracion$
BEGIN
  -- 1. Ingreso con Face ID o huella
  CREATE TABLE IF NOT EXISTS "passkey_login" (
    "id" TEXT NOT NULL, "challenge" TEXT NOT NULL, "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "passkey_login_pkey" PRIMARY KEY ("id")
  );
  CREATE INDEX IF NOT EXISTS "passkey_login_expires_at_idx" ON "passkey_login"("expires_at");
  ALTER TABLE "passkey_login" ENABLE ROW LEVEL SECURITY;

  -- 2. Código de acceso de los empleados y Face ID por empleado
  ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "access_code_enc" TEXT;
  ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "access_code_hash" TEXT;
  ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "require_passkey" BOOLEAN NOT NULL DEFAULT false;
  CREATE UNIQUE INDEX IF NOT EXISTS "employee_access_code_hash_key" ON "employee"("access_code_hash");
  DROP TABLE IF EXISTS "activation_code";

  -- 3. De qué anuncio llegó cada chat y demostración
  ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "ad_id" TEXT;
  ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "ad_title" TEXT;
  ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "ad_url" TEXT;
  ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "ad_source_type" TEXT;
  ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "ad_at" TIMESTAMPTZ(3);
  ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "demo" BOOLEAN NOT NULL DEFAULT false;
  CREATE INDEX IF NOT EXISTS "conversation_company_id_ad_id_idx" ON "conversation"("company_id", "ad_id");
  ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "buttons" JSONB;

  -- 4. Comentarios de redes
  IF to_regclass('public.social_comment') IS NULL THEN
    CREATE TABLE "social_comment" (
      "id" UUID NOT NULL, "company_id" UUID NOT NULL, "channel" TEXT NOT NULL, "external_id" TEXT NOT NULL,
      "parent_id" TEXT, "post_id" TEXT, "post_text" TEXT, "post_url" TEXT, "author_id" TEXT, "author_name" TEXT,
      "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "ai_type" TEXT, "ai_suggestion" TEXT,
      "ai_private" TEXT, "ai_error" TEXT, "reply" TEXT, "replied_at" TIMESTAMPTZ(3), "replied_by_id" UUID,
      "demo" BOOLEAN NOT NULL DEFAULT false, "posted_at" TIMESTAMPTZ(3) NOT NULL,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "social_comment_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "social_comment_company_id_status_posted_at_idx" ON "social_comment"("company_id", "status", "posted_at");
    CREATE UNIQUE INDEX "social_comment_company_id_external_id_key" ON "social_comment"("company_id", "external_id");
    ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_status_check" CHECK ("status" IN ('PENDING', 'REPLIED', 'PRIVATE', 'IGNORED'));
    ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_channel_check" CHECK ("channel" IN ('FACEBOOK', 'INSTAGRAM'));
    ALTER TABLE "social_comment" ENABLE ROW LEVEL SECURITY;
  END IF;

  -- 5. Agenda y aprendizaje de la IA
  ALTER TABLE "crm_ai_config" ADD COLUMN IF NOT EXISTS "auto_learn" BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE "crm_ai_config" ADD COLUMN IF NOT EXISTS "last_learn_at" TIMESTAMPTZ(3);
  ALTER TABLE "crm_ai_config" ADD COLUMN IF NOT EXISTS "booking_enabled" BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE "crm_ai_config" ADD COLUMN IF NOT EXISTS "booking_site_id" UUID;
  ALTER TABLE "crm_ai_config" ADD COLUMN IF NOT EXISTS "slot_minutes" INTEGER NOT NULL DEFAULT 60;
  ALTER TABLE "crm_ai_config" ADD COLUMN IF NOT EXISTS "slot_capacity" INTEGER NOT NULL DEFAULT 1;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_ai_config_slots_check') THEN
    ALTER TABLE "crm_ai_config" ADD CONSTRAINT "crm_ai_config_slots_check" CHECK ("slot_minutes" BETWEEN 10 AND 480 AND "slot_capacity" BETWEEN 1 AND 50);
  END IF;
  IF to_regclass('public.appointment') IS NULL THEN
    CREATE TABLE "appointment" (
      "id" UUID NOT NULL, "company_id" UUID NOT NULL, "customer_id" UUID NOT NULL, "site_id" UUID, "conversation_id" UUID,
      "starts_at" TIMESTAMPTZ(3) NOT NULL, "duration_min" INTEGER NOT NULL DEFAULT 60, "status" TEXT NOT NULL DEFAULT 'BOOKED',
      "source" TEXT NOT NULL DEFAULT 'MANUAL', "notes" TEXT, "created_by_id" UUID,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
      CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "appointment_company_id_starts_at_idx" ON "appointment"("company_id", "starts_at");
    CREATE INDEX "appointment_company_id_customer_id_idx" ON "appointment"("company_id", "customer_id");
    ALTER TABLE "appointment" ADD CONSTRAINT "appointment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "appointment" ADD CONSTRAINT "appointment_customer_id_company_id_fkey" FOREIGN KEY ("customer_id", "company_id") REFERENCES "customer"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "appointment" ADD CONSTRAINT "appointment_status_check" CHECK ("status" IN ('BOOKED', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELLED'));
    ALTER TABLE "appointment" ADD CONSTRAINT "appointment_duration_check" CHECK ("duration_min" BETWEEN 5 AND 600);
    ALTER TABLE "appointment" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.crm_ai_version') IS NULL THEN
    CREATE TABLE "crm_ai_version" (
      "id" UUID NOT NULL, "company_id" UUID NOT NULL, "knowledge" TEXT NOT NULL, "instructions" TEXT NOT NULL, "escalation" TEXT NOT NULL,
      "source" TEXT NOT NULL, "summary" TEXT, "metrics" JSONB, "changes" JSONB, "created_by_id" UUID,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "crm_ai_version_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "crm_ai_version_company_id_created_at_idx" ON "crm_ai_version"("company_id", "created_at");
    ALTER TABLE "crm_ai_version" ADD CONSTRAINT "crm_ai_version_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "crm_ai_version" ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Registro de migraciones (como prisma migrate deploy)
  INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
  SELECT gen_random_uuid()::text, v.checksum, now(), v.name, NULL, NULL, now(), 1
  FROM (VALUES
    ('20261124000000_activation', '82bac27f310f335c16c4d20cdd472c2148d8948780e13e61ad7587986861c619'),
    ('20261125000000_access_code', 'a6f3ed5617cadd66336d408b75869b2833a1f36407c2c870578ccc1fe53d6e71'),
    ('20261126000000_crm_ads_comments', '1c202081f91ac2506f980e2f3d57bf31aefac3c19a3d0a36b6beb02348b769c2'),
    ('20261127000000_agenda_learning', '09a2af111ce4ecc11b797182c68d861e1197f209779af68ccdaa6a04e3e44032')
  ) AS v(name, checksum)
  WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" m WHERE m.migration_name = v.name);
END
$migracion$;

SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'employee' AND column_name = 'access_code_hash') AS codigo_empleados,
  to_regclass('public.social_comment') AS comentarios,
  to_regclass('public.appointment') AS agenda,
  to_regclass('public.crm_ai_version') AS aprendizaje;
