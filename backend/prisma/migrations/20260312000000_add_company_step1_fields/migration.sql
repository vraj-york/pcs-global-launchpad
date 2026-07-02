-- AlterTable: Add Step 1 company fields (ownership type, DBA, website, region, language, company phone)
ALTER TABLE "corporation_companies" ADD COLUMN "dba_name" VARCHAR(255);
ALTER TABLE "corporation_companies" ADD COLUMN "website" VARCHAR(255);
ALTER TABLE "corporation_companies" ADD COLUMN "ownership_type" VARCHAR(255) NOT NULL DEFAULT 'Wholly Owned';
ALTER TABLE "corporation_companies" ADD COLUMN "data_residency_region" VARCHAR(255) NOT NULL DEFAULT 'North America';
ALTER TABLE "corporation_companies" ADD COLUMN "primary_language" VARCHAR(255);
ALTER TABLE "corporation_companies" ADD COLUMN "phone_no" VARCHAR(255) NOT NULL DEFAULT '';

-- Remove defaults so new rows must provide values for required columns
ALTER TABLE "corporation_companies" ALTER COLUMN "ownership_type" DROP DEFAULT;
ALTER TABLE "corporation_companies" ALTER COLUMN "data_residency_region" DROP DEFAULT;
ALTER TABLE "corporation_companies" ALTER COLUMN "phone_no" DROP DEFAULT;

-- Backfill existing rows: set phone_no to work_phone if empty (optional, for existing data)
UPDATE "corporation_companies" SET "phone_no" = "work_phone" WHERE "phone_no" = '';
