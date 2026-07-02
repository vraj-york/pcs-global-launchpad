-- DropIndex
DROP INDEX "corporations_companyCode_key";

-- AlterTable
ALTER TABLE "corporations" RENAME COLUMN "companyCode" TO "corporation_code";

-- CreateIndex
CREATE UNIQUE INDEX "corporations_corporation_code_key" ON "corporations"("corporation_code");
