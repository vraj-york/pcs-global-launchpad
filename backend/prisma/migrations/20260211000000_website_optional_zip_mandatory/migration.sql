-- AlterTable: Make corporation.website optional (nullable)
ALTER TABLE "corporations" ALTER COLUMN "website" DROP NOT NULL;

-- Data fix: Set empty string for any NULL zip before making column NOT NULL
UPDATE "corporation_addresses" SET "zip" = '' WHERE "zip" IS NULL;

-- AlterTable: Make corporation_addresses.zip mandatory (NOT NULL)
ALTER TABLE "corporation_addresses" ALTER COLUMN "zip" SET NOT NULL;
