/*
  Warnings:

  - You are about to drop the column `admin_email` on the `corporation_companies` table. All the data in the column will be lost.
  - You are about to drop the column `admin_name` on the `corporation_companies` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "corporation_companies_corporation_id_admin_email_key";

-- AlterTable
ALTER TABLE "corporation_companies" DROP COLUMN "admin_email",
DROP COLUMN "admin_name";
