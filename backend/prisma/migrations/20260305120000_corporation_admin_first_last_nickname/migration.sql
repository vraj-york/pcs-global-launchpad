-- AlterTable: rename name to first_name, add last_name and nickname on corporation_admins
ALTER TABLE "corporation_admins" ADD COLUMN "first_name" VARCHAR(255);
ALTER TABLE "corporation_admins" ADD COLUMN "last_name" VARCHAR(255);
ALTER TABLE "corporation_admins" ADD COLUMN "nickname" VARCHAR(255);

UPDATE "corporation_admins" SET "first_name" = "name", "last_name" = '' WHERE "name" IS NOT NULL;

ALTER TABLE "corporation_admins" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "corporation_admins" ALTER COLUMN "last_name" SET NOT NULL;

ALTER TABLE "corporation_admins" DROP COLUMN "name";
