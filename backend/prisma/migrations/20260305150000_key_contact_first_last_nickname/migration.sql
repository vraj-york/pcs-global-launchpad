-- AlterTable: rename name to first_name, add last_name and nickname on corporation_key_contacts
ALTER TABLE "corporation_key_contacts" ADD COLUMN "first_name" VARCHAR(255);
ALTER TABLE "corporation_key_contacts" ADD COLUMN "last_name" VARCHAR(255);
ALTER TABLE "corporation_key_contacts" ADD COLUMN "nickname" VARCHAR(255);

UPDATE "corporation_key_contacts" SET "first_name" = "name", "last_name" = '' WHERE "name" IS NOT NULL;

ALTER TABLE "corporation_key_contacts" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "corporation_key_contacts" ALTER COLUMN "last_name" SET NOT NULL;

ALTER TABLE "corporation_key_contacts" DROP COLUMN "name";
