/*
  Warnings:

  - Added the required column `email` to the `corporation_companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `corporation_companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `corporation_companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `work_phone` to the `corporation_companies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "corporation_companies" ADD COLUMN     "cell_phone" VARCHAR(255),
ADD COLUMN     "email" VARCHAR(255) NOT NULL,
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "role" VARCHAR(255) NOT NULL,
ADD COLUMN     "work_phone" VARCHAR(255) NOT NULL;
