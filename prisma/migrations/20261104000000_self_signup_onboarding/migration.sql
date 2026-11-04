-- Autoregistro de empresas y asistente de configuración inicial.
ALTER TABLE "company" ADD COLUMN "self_signup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "company" ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ(3);

-- Las empresas que ya existían ya están configuradas: no se les muestra el asistente.
UPDATE "company" SET "onboarding_completed_at" = "created_at";
