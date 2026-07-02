/*
  Warnings:

  - A unique constraint covering the columns `[legal_name]` on the table `corporations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "corporations_legal_name_idx";

-- CreateIndex
CREATE UNIQUE INDEX "corporations_legal_name_key" ON "corporations"("legal_name");
