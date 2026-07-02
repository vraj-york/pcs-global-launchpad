-- CreateEnum
CREATE TYPE "PasswordResetAuditEventType" AS ENUM ('RESET_REQUEST', 'RESET_COMPLETION', 'RESET_FAILED');

-- CreateTable
CREATE TABLE "password_reset_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(255),
    "event_type" "PasswordResetAuditEventType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_audit_logs_event_type_idx" ON "password_reset_audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "password_reset_audit_logs_user_id_idx" ON "password_reset_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_audit_logs_created_at_idx" ON "password_reset_audit_logs"("created_at");
