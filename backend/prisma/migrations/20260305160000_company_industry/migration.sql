-- AlterTable: add mandatory industry to corporation_companies
ALTER TABLE "corporation_companies" ADD COLUMN "industry" VARCHAR(255);

UPDATE "corporation_companies" SET "industry" = '' WHERE "industry" IS NULL;

ALTER TABLE "corporation_companies" ALTER COLUMN "industry" SET NOT NULL;
