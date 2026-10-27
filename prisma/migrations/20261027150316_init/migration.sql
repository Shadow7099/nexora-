-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'COMPANY_ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CC', 'CE', 'PPT', 'PASAPORTE', 'TI');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZAJE', 'PRESTACION_SERVICIOS');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('ORDINARIO', 'INTEGRAL');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('QUINCENAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "ArlRiskClass" AS ENUM ('I', 'II', 'III', 'IV', 'V');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('IN', 'OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "PunchSource" AS ENUM ('QR', 'ADMIN_MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GeoStatus" AS ENUM ('INSIDE', 'OUTSIDE', 'LOW_ACCURACY', 'UNAVAILABLE', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('PASSKEY', 'DEVICE_TOKEN', 'ADMIN');

-- CreateEnum
CREATE TYPE "PunchStatus" AS ENUM ('ACCEPTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "AttemptReason" AS ENUM ('OUTSIDE_RADIUS', 'LOW_ACCURACY', 'LOCATION_DENIED', 'DEVICE_NOT_BOUND', 'DEVICE_REVOKED', 'INVALID_QR', 'QR_REVOKED', 'WRONG_COMPANY', 'DUPLICATE_PUNCH', 'NO_OPEN_SESSION', 'RATE_LIMITED', 'PASSKEY_FAILED', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PLANNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoveltyType" AS ENUM ('VACACIONES', 'INCAPACIDAD_COMUN', 'INCAPACIDAD_LABORAL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD', 'LICENCIA_REMUNERADA', 'LICENCIA_NO_REMUNERADA', 'LICENCIA_LUTO', 'CALAMIDAD_DOMESTICA', 'PERMISO', 'AUSENCIA_INJUSTIFICADA', 'SUSPENSION');

-- CreateEnum
CREATE TYPE "ParameterUnit" AS ENUM ('COP', 'PERCENT', 'HOURS', 'MINUTES', 'TIME_OF_DAY', 'DAYS', 'COUNT');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'REVIEWED', 'CLOSED');

-- CreateTable
CREATE TABLE "company" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "nit" TEXT,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "status" "CompanyStatus" NOT NULL DEFAULT 'TRIAL',
    "plan_code" TEXT,
    "max_employees" INTEGER,
    "max_sites" INTEGER,
    "late_tolerance_min" INTEGER NOT NULL DEFAULT 5,
    "geo_max_accuracy_m" INTEGER NOT NULL DEFAULT 100,
    "require_device_binding" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "device_binding_id" UUID,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey_credential" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_binding_id" UUID,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "name" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3),

    CONSTRAINT "passkey_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_consent" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "policy_version" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "data_consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 80,
    "manager_user_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_opening_hours" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opens_min" INTEGER NOT NULL,
    "closes_min" INTEGER NOT NULL,

    CONSTRAINT "site_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_qr_code" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "public_code" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "site_qr_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "default_site_id" UUID,
    "hire_date" DATE NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_contract" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "salary_type" "SalaryType" NOT NULL DEFAULT 'ORDINARIO',
    "monthly_salary" DECIMAL(14,2) NOT NULL,
    "weekly_hours" DECIMAL(5,2) NOT NULL,
    "pay_frequency" "PayFrequency" NOT NULL,
    "arl_risk_class" "ArlRiskClass" NOT NULL DEFAULT 'I',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_binding" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "user_agent" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMPTZ(3),
    "last_seen_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "revoke_reason" TEXT,

    CONSTRAINT "device_binding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_template" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_min" INTEGER NOT NULL,
    "end_min" INTEGER NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "break_paid" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shift_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_pattern" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cycle_days" INTEGER NOT NULL DEFAULT 7,
    "anchor_date" DATE NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,

    CONSTRAINT "schedule_pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_pattern_day" (
    "id" UUID NOT NULL,
    "pattern_id" UUID NOT NULL,
    "day_index" INTEGER NOT NULL,
    "template_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,

    CONSTRAINT "schedule_pattern_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_shift" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "template_id" UUID,
    "work_date" DATE NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "break_paid" BOOLEAN NOT NULL DEFAULT false,
    "status" "ShiftStatus" NOT NULL DEFAULT 'PLANNED',
    "note" TEXT,

    CONSTRAINT "scheduled_shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_event" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "type" "PunchType" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "PunchSource" NOT NULL,
    "status" "PunchStatus" NOT NULL DEFAULT 'ACCEPTED',
    "verification" "VerificationMethod" NOT NULL,
    "geo_status" "GeoStatus" NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "accuracy_meters" INTEGER,
    "distance_meters" INTEGER,
    "qr_code_id" UUID,
    "device_binding_id" UUID,
    "created_by_id" UUID,
    "reason" TEXT,
    "corrects_event_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "user_agent" TEXT,

    CONSTRAINT "attendance_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_attempt" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "user_id" UUID,
    "site_id" UUID,
    "reason" "AttemptReason" NOT NULL,
    "detail" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "attendance_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_session" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "scheduled_shift_id" UUID,
    "in_event_id" UUID NOT NULL,
    "out_event_id" UUID,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3),
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'OPEN',
    "review_note" TEXT,

    CONSTRAINT "work_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_request" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "work_session_id" UUID,
    "work_date" DATE NOT NULL,
    "detected_minutes" INTEGER NOT NULL,
    "approved_minutes" INTEGER,
    "employee_note" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novelty" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" "NoveltyType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "hours" DECIMAL(6,2),
    "note" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" UUID NOT NULL,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novelty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_parameter" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "key" TEXT NOT NULL,
    "value" DECIMAL(16,4) NOT NULL,
    "unit" "ParameterUnit" NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "legal_source" TEXT NOT NULL,
    "source_url" TEXT,
    "verified_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labor_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_period" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "frequency" "PayFrequency" NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_estimate" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "gross_estimate" DECIMAL(14,2) NOT NULL,
    "deductions" DECIMAL(14,2) NOT NULL,
    "net_estimate" DECIMAL(14,2) NOT NULL,
    "employer_cost" DECIMAL(14,2) NOT NULL,
    "parameter_snapshot" JSONB NOT NULL,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_estimate_line" (
    "id" UUID NOT NULL,
    "estimate_id" UUID NOT NULL,
    "concept" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(16,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "basis" TEXT NOT NULL,

    CONSTRAINT "payroll_estimate_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_slug_key" ON "company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "app_user_company_id_role_idx" ON "app_user"("company_id", "role");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "session_expires_at_idx" ON "session"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credential_credential_id_key" ON "passkey_credential"("credential_id");

-- CreateIndex
CREATE INDEX "passkey_credential_user_id_idx" ON "passkey_credential"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_consent_user_id_policy_version_key" ON "data_consent"("user_id", "policy_version");

-- CreateIndex
CREATE UNIQUE INDEX "site_id_company_id_key" ON "site"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_company_id_name_key" ON "site"("company_id", "name");

-- CreateIndex
CREATE INDEX "site_opening_hours_site_id_weekday_idx" ON "site_opening_hours"("site_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "site_qr_code_public_code_key" ON "site_qr_code"("public_code");

-- CreateIndex
CREATE UNIQUE INDEX "site_qr_code_site_id_version_key" ON "site_qr_code"("site_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "employee_user_id_key" ON "employee"("user_id");

-- CreateIndex
CREATE INDEX "employee_company_id_status_idx" ON "employee"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_id_company_id_key" ON "employee"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_company_id_document_type_document_number_key" ON "employee"("company_id", "document_type", "document_number");

-- CreateIndex
CREATE INDEX "employee_contract_employee_id_start_date_idx" ON "employee_contract"("employee_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "device_binding_token_hash_key" ON "device_binding"("token_hash");

-- CreateIndex
CREATE INDEX "device_binding_employee_id_status_idx" ON "device_binding"("employee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shift_template_company_id_name_key" ON "shift_template"("company_id", "name");

-- CreateIndex
CREATE INDEX "schedule_pattern_employee_id_effective_from_idx" ON "schedule_pattern"("employee_id", "effective_from");

-- CreateIndex
CREATE INDEX "schedule_pattern_day_pattern_id_day_index_idx" ON "schedule_pattern_day"("pattern_id", "day_index");

-- CreateIndex
CREATE INDEX "scheduled_shift_company_id_work_date_idx" ON "scheduled_shift"("company_id", "work_date");

-- CreateIndex
CREATE INDEX "scheduled_shift_employee_id_start_at_idx" ON "scheduled_shift"("employee_id", "start_at");

-- CreateIndex
CREATE INDEX "holiday_date_idx" ON "holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "holiday_company_id_date_key" ON "holiday"("company_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_event_idempotency_key_key" ON "attendance_event"("idempotency_key");

-- CreateIndex
CREATE INDEX "attendance_event_company_id_occurred_at_idx" ON "attendance_event"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attendance_event_employee_id_occurred_at_idx" ON "attendance_event"("employee_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attendance_attempt_company_id_occurred_at_idx" ON "attendance_attempt"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attendance_attempt_user_id_occurred_at_idx" ON "attendance_attempt"("user_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "work_session_in_event_id_key" ON "work_session"("in_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_session_out_event_id_key" ON "work_session"("out_event_id");

-- CreateIndex
CREATE INDEX "work_session_company_id_start_at_idx" ON "work_session"("company_id", "start_at");

-- CreateIndex
CREATE INDEX "work_session_employee_id_start_at_idx" ON "work_session"("employee_id", "start_at");

-- CreateIndex
CREATE INDEX "overtime_request_company_id_status_idx" ON "overtime_request"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_request_work_session_id_key" ON "overtime_request"("work_session_id");

-- CreateIndex
CREATE INDEX "novelty_company_id_start_date_idx" ON "novelty"("company_id", "start_date");

-- CreateIndex
CREATE INDEX "novelty_employee_id_start_date_idx" ON "novelty"("employee_id", "start_date");

-- CreateIndex
CREATE INDEX "labor_parameter_key_valid_from_idx" ON "labor_parameter"("key", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "labor_parameter_company_id_key_valid_from_key" ON "labor_parameter"("company_id", "key", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_period_id_company_id_key" ON "payroll_period"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_period_company_id_start_date_end_date_key" ON "payroll_period"("company_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_estimate_period_id_employee_id_key" ON "payroll_estimate"("period_id", "employee_id");

-- CreateIndex
CREATE INDEX "payroll_estimate_line_estimate_id_idx" ON "payroll_estimate_line"("estimate_id");

-- CreateIndex
CREATE INDEX "audit_log_company_id_occurred_at_idx" ON "audit_log"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_device_binding_id_fkey" FOREIGN KEY ("device_binding_id") REFERENCES "device_binding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey_credential" ADD CONSTRAINT "passkey_credential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey_credential" ADD CONSTRAINT "passkey_credential_device_binding_id_fkey" FOREIGN KEY ("device_binding_id") REFERENCES "device_binding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_consent" ADD CONSTRAINT "data_consent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_opening_hours" ADD CONSTRAINT "site_opening_hours_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_qr_code" ADD CONSTRAINT "site_qr_code_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_qr_code" ADD CONSTRAINT "site_qr_code_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_default_site_id_fkey" FOREIGN KEY ("default_site_id") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_contract" ADD CONSTRAINT "employee_contract_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_contract" ADD CONSTRAINT "employee_contract_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_binding" ADD CONSTRAINT "device_binding_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_binding" ADD CONSTRAINT "device_binding_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_template" ADD CONSTRAINT "shift_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_pattern" ADD CONSTRAINT "schedule_pattern_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_pattern" ADD CONSTRAINT "schedule_pattern_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_pattern_day" ADD CONSTRAINT "schedule_pattern_day_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "schedule_pattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_pattern_day" ADD CONSTRAINT "schedule_pattern_day_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "shift_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_pattern_day" ADD CONSTRAINT "schedule_pattern_day_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_shift" ADD CONSTRAINT "scheduled_shift_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_shift" ADD CONSTRAINT "scheduled_shift_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_shift" ADD CONSTRAINT "scheduled_shift_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_shift" ADD CONSTRAINT "scheduled_shift_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "shift_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday" ADD CONSTRAINT "holiday_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_event" ADD CONSTRAINT "attendance_event_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_event" ADD CONSTRAINT "attendance_event_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_event" ADD CONSTRAINT "attendance_event_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_event" ADD CONSTRAINT "attendance_event_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "site_qr_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_event" ADD CONSTRAINT "attendance_event_device_binding_id_fkey" FOREIGN KEY ("device_binding_id") REFERENCES "device_binding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_event" ADD CONSTRAINT "attendance_event_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_event" ADD CONSTRAINT "attendance_event_corrects_event_id_fkey" FOREIGN KEY ("corrects_event_id") REFERENCES "attendance_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_attempt" ADD CONSTRAINT "attendance_attempt_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_site_id_company_id_fkey" FOREIGN KEY ("site_id", "company_id") REFERENCES "site"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_scheduled_shift_id_fkey" FOREIGN KEY ("scheduled_shift_id") REFERENCES "scheduled_shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_in_event_id_fkey" FOREIGN KEY ("in_event_id") REFERENCES "attendance_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_out_event_id_fkey" FOREIGN KEY ("out_event_id") REFERENCES "attendance_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_request" ADD CONSTRAINT "overtime_request_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_request" ADD CONSTRAINT "overtime_request_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_request" ADD CONSTRAINT "overtime_request_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "work_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_request" ADD CONSTRAINT "overtime_request_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novelty" ADD CONSTRAINT "novelty_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novelty" ADD CONSTRAINT "novelty_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novelty" ADD CONSTRAINT "novelty_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novelty" ADD CONSTRAINT "novelty_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_parameter" ADD CONSTRAINT "labor_parameter_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_estimate" ADD CONSTRAINT "payroll_estimate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_estimate" ADD CONSTRAINT "payroll_estimate_period_id_company_id_fkey" FOREIGN KEY ("period_id", "company_id") REFERENCES "payroll_period"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_estimate" ADD CONSTRAINT "payroll_estimate_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_estimate_line" ADD CONSTRAINT "payroll_estimate_line_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "payroll_estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────── Garantías adicionales (escritas a mano) ───────────────

-- Una sola jornada abierta por empleado: impide una segunda entrada
-- aunque lleguen dos solicitudes simultáneas.
CREATE UNIQUE INDEX "work_session_one_open_per_employee"
  ON "work_session" ("employee_id") WHERE "status" = 'OPEN';

-- Un solo QR vigente por sede.
CREATE UNIQUE INDEX "site_qr_code_one_active_per_site"
  ON "site_qr_code" ("site_id") WHERE "revoked_at" IS NULL;

-- Registros de solo inserción: el tiempo real y la auditoría no se editan ni se borran.
CREATE FUNCTION nexora_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo inserción (operación % bloqueada)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_event_append_only
  BEFORE UPDATE OR DELETE ON "attendance_event"
  FOR EACH ROW EXECUTE FUNCTION nexora_forbid_mutation();

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION nexora_forbid_mutation();

-- Coherencia de datos
ALTER TABLE "site" ADD CONSTRAINT "site_coords_valid"
  CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "site" ADD CONSTRAINT "site_radius_valid"
  CHECK ("radius_meters" BETWEEN 10 AND 2000);
ALTER TABLE "site_opening_hours" ADD CONSTRAINT "opening_hours_valid"
  CHECK ("weekday" BETWEEN 1 AND 7 AND "opens_min" >= 0 AND "closes_min" > "opens_min" AND "closes_min" <= 2880);
ALTER TABLE "shift_template" ADD CONSTRAINT "shift_template_valid"
  CHECK ("start_min" BETWEEN 0 AND 1439 AND "end_min" > "start_min" AND "end_min" <= "start_min" + 1440 AND "break_minutes" >= 0);
ALTER TABLE "scheduled_shift" ADD CONSTRAINT "scheduled_shift_valid"
  CHECK ("end_at" > "start_at" AND "break_minutes" >= 0);
ALTER TABLE "schedule_pattern" ADD CONSTRAINT "schedule_pattern_valid"
  CHECK ("cycle_days" BETWEEN 1 AND 56 AND ("effective_to" IS NULL OR "effective_to" >= "effective_from"));
ALTER TABLE "schedule_pattern_day" ADD CONSTRAINT "pattern_day_valid"
  CHECK ("day_index" >= 0);
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_valid"
  CHECK (("end_at" IS NULL OR "end_at" >= "start_at") AND ("status" = 'OPEN') = ("out_event_id" IS NULL AND "end_at" IS NULL));
ALTER TABLE "attendance_event" ADD CONSTRAINT "manual_punch_needs_reason"
  CHECK ("source" <> 'ADMIN_MANUAL' OR ("created_by_id" IS NOT NULL AND "reason" IS NOT NULL AND length(trim("reason")) > 0));
ALTER TABLE "overtime_request" ADD CONSTRAINT "overtime_valid"
  CHECK ("detected_minutes" >= 0 AND ("approved_minutes" IS NULL OR "approved_minutes" BETWEEN 0 AND "detected_minutes")
         AND ("status" IN ('APPROVED','REJECTED')) = ("decided_at" IS NOT NULL AND "decided_by_id" IS NOT NULL));
ALTER TABLE "novelty" ADD CONSTRAINT "novelty_dates_valid"
  CHECK ("end_date" >= "start_date");
ALTER TABLE "employee_contract" ADD CONSTRAINT "contract_valid"
  CHECK ("monthly_salary" > 0 AND "weekly_hours" > 0 AND ("end_date" IS NULL OR "end_date" >= "start_date"));
ALTER TABLE "labor_parameter" ADD CONSTRAINT "labor_parameter_dates_valid"
  CHECK ("valid_to" IS NULL OR "valid_to" >= "valid_from");
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_valid"
  CHECK ("end_date" >= "start_date");

-- Correo único sin distinguir mayúsculas
CREATE UNIQUE INDEX "app_user_email_lower" ON "app_user" (lower("email"));
