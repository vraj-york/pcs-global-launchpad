-- AlterTable: Add address fields to corporation_companies (required, backfill existing rows with empty string)
ALTER TABLE "corporation_companies" ADD COLUMN "address_line" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "corporation_companies" ADD COLUMN "state" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "corporation_companies" ADD COLUMN "city" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "corporation_companies" ADD COLUMN "country" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "corporation_companies" ADD COLUMN "zip" VARCHAR(255) NOT NULL DEFAULT '';

-- Remove defaults so new rows must provide values (optional; keeps DB consistent with "required" semantics)
ALTER TABLE "corporation_companies" ALTER COLUMN "address_line" DROP DEFAULT;
ALTER TABLE "corporation_companies" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "corporation_companies" ALTER COLUMN "city" DROP DEFAULT;
ALTER TABLE "corporation_companies" ALTER COLUMN "country" DROP DEFAULT;
ALTER TABLE "corporation_companies" ALTER COLUMN "zip" DROP DEFAULT;
