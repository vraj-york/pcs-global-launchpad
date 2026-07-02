/*
  Warnings:

  - Added the required column `mode` to the `corporations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "corporations" ADD COLUMN     "mode" VARCHAR(255) NOT NULL;
