/*
  Warnings:

  - You are about to drop the column `category_id` on the `app_users` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `app_users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "app_users" DROP CONSTRAINT "app_users_category_id_fkey";

-- DropForeignKey
ALTER TABLE "app_users" DROP CONSTRAINT "app_users_company_id_fkey";

-- DropIndex
DROP INDEX "app_users_category_id_idx";

-- DropIndex
DROP INDEX "app_users_company_id_idx";

-- AlterTable
ALTER TABLE "app_users" DROP COLUMN "category_id",
DROP COLUMN "company_id";
