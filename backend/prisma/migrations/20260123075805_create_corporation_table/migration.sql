-- CreateEnum
CREATE TYPE "TwoFactorAuth" AS ENUM ('ON', 'OFF');

-- CreateTable
CREATE TABLE "corporations" (
    "id" TEXT NOT NULL,
    "companyCode" INTEGER NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "DBA_name" VARCHAR(255),
    "website" VARCHAR(255) NOT NULL,
    "data_residency_region" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(255) NOT NULL,
    "phone_no" VARCHAR(255) NOT NULL,
    "brand_logo" VARCHAR(255),
    "status" VARCHAR(255) NOT NULL,
    "suspend_close_reason" VARCHAR(255),
    "suspend_close_additional_notes" VARCHAR(255),
    "submitted_steps" INTEGER NOT NULL DEFAULT 1,
    "password_policy" VARCHAR(255),
    "MFA" "TwoFactorAuth" NOT NULL DEFAULT 'OFF',
    "session_timeout" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corporations_status_idx" ON "corporations"("status");

-- CreateIndex
CREATE INDEX "corporations_legal_name_idx" ON "corporations"("legal_name");

-- CreateIndex
CREATE INDEX "corporations_status_created_at_idx" ON "corporations"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "corporations_companyCode_key" ON "corporations"("companyCode");
