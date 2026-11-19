-- CreateTable
CREATE TABLE "activation_code" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey_login" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkey_login_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activation_code_code_hash_key" ON "activation_code"("code_hash");

-- CreateIndex
CREATE INDEX "activation_code_employee_id_idx" ON "activation_code"("employee_id");

-- CreateIndex
CREATE INDEX "passkey_login_expires_at_idx" ON "passkey_login"("expires_at");

-- AddForeignKey
ALTER TABLE "activation_code" ADD CONSTRAINT "activation_code_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_code" ADD CONSTRAINT "activation_code_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "activation_code" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passkey_login" ENABLE ROW LEVEL SECURITY;
