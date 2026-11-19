-- DropForeignKey
ALTER TABLE "activation_code" DROP CONSTRAINT "activation_code_company_id_fkey";

-- DropForeignKey
ALTER TABLE "activation_code" DROP CONSTRAINT "activation_code_employee_id_company_id_fkey";

-- AlterTable
ALTER TABLE "employee" ADD COLUMN     "access_code_enc" TEXT,
ADD COLUMN     "access_code_hash" TEXT,
ADD COLUMN     "require_passkey" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "activation_code";

-- CreateIndex
CREATE UNIQUE INDEX "employee_access_code_hash_key" ON "employee"("access_code_hash");

