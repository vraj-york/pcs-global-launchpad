-- AlterTable: Add metadata JSON column for role/permission audit before/after snapshots
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
