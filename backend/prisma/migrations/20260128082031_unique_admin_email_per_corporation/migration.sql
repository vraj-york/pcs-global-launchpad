/*
  Warnings:

  - A unique constraint covering the columns `[corporation_id,admin_email]` on the table `corporation_companies` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "corporation_companies_corporation_id_admin_email_key" ON "corporation_companies"("corporation_id", "admin_email");
