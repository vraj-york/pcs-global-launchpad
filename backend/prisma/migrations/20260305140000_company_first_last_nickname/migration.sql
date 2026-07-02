-- AlterTable: rename name to first_name, add last_name and nickname on corporation_companies
ALTER TABLE "corporation_companies" ADD COLUMN "first_name" VARCHAR(255);
ALTER TABLE "corporation_companies" ADD COLUMN "last_name" VARCHAR(255);
ALTER TABLE "corporation_companies" ADD COLUMN "nickname" VARCHAR(255);

UPDATE "corporation_companies" SET "first_name" = "name", "last_name" = '' WHERE "name" IS NOT NULL;

ALTER TABLE "corporation_companies" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "corporation_companies" ALTER COLUMN "last_name" SET NOT NULL;

ALTER TABLE "corporation_companies" DROP COLUMN "name";
