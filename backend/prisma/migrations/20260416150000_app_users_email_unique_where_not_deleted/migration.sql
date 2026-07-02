-- Unique email only for active rows (soft-deleted rows may reuse the same email).
DROP INDEX IF EXISTS "app_users_email_key";

CREATE UNIQUE INDEX "app_users_email_active_unique" ON "app_users" ("email") WHERE "deleted_at" IS NULL;
