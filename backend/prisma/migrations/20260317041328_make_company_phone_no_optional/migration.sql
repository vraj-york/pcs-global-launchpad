-- DropForeignKey
ALTER TABLE "corporation_companies" DROP CONSTRAINT "corporation_companies_plan_id_fkey";

-- AlterTable
ALTER TABLE "corporation_companies" ALTER COLUMN "phone_no" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "corporation_companies" ADD CONSTRAINT "corporation_companies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
