-- Fase 8: intentos de ingreso fallidos por red (solo el hash de la IP).
CREATE TABLE "login_throttle" (
    "id" UUID NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_throttle_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_throttle_ip_hash_occurred_at_idx" ON "login_throttle"("ip_hash", "occurred_at");

-- Cerrada a la API pública de Supabase como el resto (RLS sin políticas; los
-- permisos de anon/authenticated ya los retiran los privilegios por defecto).
ALTER TABLE "login_throttle" ENABLE ROW LEVEL SECURITY;
