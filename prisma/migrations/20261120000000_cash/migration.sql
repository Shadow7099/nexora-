-- Caja: movimientos de ingreso y egreso por sede y día (se anulan, no se borran) y cierres con arqueo.
-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'OTHER');

-- CreateTable
CREATE TABLE "cash_movement" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "category" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "source_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMPTZ(3),
    "voided_by_id" UUID,
    "void_reason" TEXT,

    CONSTRAINT "cash_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closing" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "opening_balance" DECIMAL(14,2) NOT NULL,
    "cash_in" DECIMAL(14,2) NOT NULL,
    "cash_out" DECIMAL(14,2) NOT NULL,
    "expected" DECIMAL(14,2) NOT NULL,
    "counted" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "totals" JSONB NOT NULL,
    "notes" TEXT,
    "closed_by_id" UUID NOT NULL,
    "closed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reopened_at" TIMESTAMPTZ(3),
    "reopened_by_id" UUID,
    "reopen_reason" TEXT,

    CONSTRAINT "cash_closing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_movement_company_id_site_id_date_idx" ON "cash_movement"("company_id", "site_id", "date");

-- CreateIndex
CREATE INDEX "cash_closing_company_id_site_id_date_idx" ON "cash_closing"("company_id", "site_id", "date");

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_reopened_by_id_fkey" FOREIGN KEY ("reopened_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Un solo cierre vigente por sede y día.
CREATE UNIQUE INDEX "cash_closing_site_date_active_key" ON "cash_closing"("site_id", "date") WHERE "reopened_at" IS NULL;
-- Un origen automático (p. ej. una venta) entra a la caja una sola vez.
CREATE UNIQUE INDEX "cash_movement_source_key" ON "cash_movement"("source", "source_id") WHERE "source" IS NOT NULL AND "voided_at" IS NULL;

ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "cash_closing" ADD CONSTRAINT "cash_closing_counted_nonneg" CHECK ("counted" >= 0);

-- Movimientos: no se borran; de una fila solo se pueden llenar (una vez) los datos de anulación.
CREATE FUNCTION nexora_cash_movement_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'Los movimientos de caja no se borran: se anulan con motivo.';
  END IF;
  IF OLD.voided_at IS NOT NULL OR NEW.voided_at IS NULL OR NEW.void_reason IS NULL
     OR (to_jsonb(NEW) - ARRAY['voided_at', 'voided_by_id', 'void_reason']) <> (to_jsonb(OLD) - ARRAY['voided_at', 'voided_by_id', 'void_reason']) THEN
    RAISE EXCEPTION 'Un movimiento de caja solo se puede anular una vez, con motivo; no se edita.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cash_movement_guard BEFORE UPDATE OR DELETE ON "cash_movement" FOR EACH ROW EXECUTE FUNCTION nexora_cash_movement_guard();
CREATE TRIGGER cash_movement_no_truncate BEFORE TRUNCATE ON "cash_movement" FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();

-- Cierres: no se borran; de una fila solo se pueden llenar (una vez) los datos de reapertura.
CREATE FUNCTION nexora_cash_closing_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'Los cierres de caja no se borran: se reabren con motivo.';
  END IF;
  IF OLD.reopened_at IS NOT NULL OR NEW.reopened_at IS NULL OR NEW.reopen_reason IS NULL
     OR (to_jsonb(NEW) - ARRAY['reopened_at', 'reopened_by_id', 'reopen_reason']) <> (to_jsonb(OLD) - ARRAY['reopened_at', 'reopened_by_id', 'reopen_reason']) THEN
    RAISE EXCEPTION 'Un cierre de caja solo se puede reabrir una vez, con motivo; no se edita.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cash_closing_guard BEFORE UPDATE OR DELETE ON "cash_closing" FOR EACH ROW EXECUTE FUNCTION nexora_cash_closing_guard();
CREATE TRIGGER cash_closing_no_truncate BEFORE TRUNCATE ON "cash_closing" FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();

-- Cerradas a la API pública de Supabase como el resto.
ALTER TABLE "cash_movement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_closing" ENABLE ROW LEVEL SECURITY;
