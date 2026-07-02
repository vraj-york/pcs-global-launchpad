-- Denormalized company admin profile moved to app_users (via user_company_access).
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "first_name";
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "last_name";
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "nickname";
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "role";
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "email";
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "work_phone";
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "cell_phone";
