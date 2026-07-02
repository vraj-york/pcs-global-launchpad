/*
  Warnings:

  - A unique constraint covering the columns `[company_code]` on the table `corporation_companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "corporation_companies" ADD COLUMN     "company_code" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "corporation_companies_company_code_key" ON "corporation_companies"("company_code");
