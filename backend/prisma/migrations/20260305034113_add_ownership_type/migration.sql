/*
  Warnings:

  - Added the required column `ownership_type` to the `corporations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "corporations" ADD COLUMN     "ownership_type" VARCHAR(255) NOT NULL;
