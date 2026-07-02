/*
  Warnings:

  - You are about to drop the column `city` on the `corporation_companies` table. All the data in the column will be lost.
  - You are about to drop the column `no_of_employees` on the `corporation_companies` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `corporation_companies` table. All the data in the column will be lost.
  - You are about to drop the column `zip` on the `corporation_companies` table. All the data in the column will be lost.
  - Added the required column `plan_id` to the `corporation_companies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "corporation_companies" DROP COLUMN "city",
DROP COLUMN "no_of_employees",
DROP COLUMN "state",
DROP COLUMN "zip",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "plan_id" TEXT NOT NULL,
ADD COLUMN     "same_as_corp_admin" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "corporation_companies" ADD CONSTRAINT "corporation_companies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
