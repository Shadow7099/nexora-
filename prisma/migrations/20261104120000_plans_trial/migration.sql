-- Planes comerciales y prueba gratuita de 1 mes.
ALTER TABLE "company" ADD COLUMN "trial_ends_at" TIMESTAMPTZ(3);

-- Las empresas que siguen en prueba tienen 1 mes desde su alta.
UPDATE "company" SET "trial_ends_at" = "created_at" + INTERVAL '1 month' WHERE "status" = 'TRIAL';
