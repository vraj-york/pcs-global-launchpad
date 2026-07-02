-- AlterTable
ALTER TABLE "corporation_companies" ADD COLUMN     "suspended_closed_on" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "corporations" ADD COLUMN     "suspended_closed_on" TIMESTAMP(3);
