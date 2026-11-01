-- AlterTable
ALTER TABLE "session" ADD COLUMN     "webauthn_challenge" TEXT,
ADD COLUMN     "webauthn_challenge_expires" TIMESTAMPTZ(3);

-- Una jornada que quedó abierta demasiado tiempo (el empleado olvidó marcar salida)
-- pasa a "por revisar" SIN hora de salida: el sistema nunca inventa una hora.
-- Antes la restricción exigía salida para todo estado distinto de OPEN.
ALTER TABLE "work_session" DROP CONSTRAINT "work_session_valid";
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_valid" CHECK (
  ("end_at" IS NULL OR "end_at" >= "start_at")
  AND ("status" <> 'OPEN' OR ("out_event_id" IS NULL AND "end_at" IS NULL))
  AND ("status" <> 'CLOSED' OR ("out_event_id" IS NOT NULL AND "end_at" IS NOT NULL))
);

-- Columnas nuevas también cerradas a los roles públicos de Supabase (RLS ya está activo en la tabla).
