-- Invitaciones para que el dueño de un negocio registre su empresa (un solo uso, con vencimiento).
CREATE TABLE "company_invitation" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "plan_code" TEXT,
    "max_employees" INTEGER,
    "max_sites" INTEGER,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "company_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "company_invitation_token_hash_key" ON "company_invitation"("token_hash");
CREATE UNIQUE INDEX "company_invitation_company_id_key" ON "company_invitation"("company_id");
CREATE INDEX "company_invitation_created_at_idx" ON "company_invitation"("created_at");
ALTER TABLE "company_invitation" ADD CONSTRAINT "company_invitation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Una invitación usada debe quedar ligada a la empresa que creó.
ALTER TABLE "company_invitation" ADD CONSTRAINT "company_invitation_used_has_company" CHECK ("used_at" IS NULL OR "company_id" IS NOT NULL);

-- Cerrada a la API pública de Supabase como el resto.
ALTER TABLE "company_invitation" ENABLE ROW LEVEL SECURITY;
