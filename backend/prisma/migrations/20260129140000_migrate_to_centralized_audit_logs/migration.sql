-- CreateTable: Centralized audit_logs for all domains
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "domain" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_domain_idx" ON "audit_logs"("domain");
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_domain_created_at_idx" ON "audit_logs"("domain", "created_at");

-- Migrate existing password_reset_audit_logs data (table created by previous migration)
INSERT INTO "audit_logs" ("id", "domain", "event_type", "user_id", "created_at")
SELECT "id", 'password_reset', "event_type"::text, "user_id", "created_at"
FROM "password_reset_audit_logs";

-- DropTable
DROP TABLE "password_reset_audit_logs";

-- DropEnum
DROP TYPE "PasswordResetAuditEventType";
