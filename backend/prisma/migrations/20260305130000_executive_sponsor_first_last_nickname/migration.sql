-- AlterTable: rename name to first_name, add last_name and nickname on corporation_executive_sponsors
DROP INDEX IF EXISTS "corporation_executive_sponsors_name_idx";

ALTER TABLE "corporation_executive_sponsors" ADD COLUMN "first_name" VARCHAR(255);
ALTER TABLE "corporation_executive_sponsors" ADD COLUMN "last_name" VARCHAR(255);
ALTER TABLE "corporation_executive_sponsors" ADD COLUMN "nickname" VARCHAR(255);

UPDATE "corporation_executive_sponsors" SET "first_name" = "name", "last_name" = '' WHERE "name" IS NOT NULL;

ALTER TABLE "corporation_executive_sponsors" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "corporation_executive_sponsors" ALTER COLUMN "last_name" SET NOT NULL;

ALTER TABLE "corporation_executive_sponsors" DROP COLUMN "name";

CREATE INDEX "corporation_executive_sponsors_first_name_idx" ON "corporation_executive_sponsors"("first_name");
