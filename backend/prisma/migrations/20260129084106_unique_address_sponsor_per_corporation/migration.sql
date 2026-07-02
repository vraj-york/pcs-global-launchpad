/*
  Warnings:

  - A unique constraint covering the columns `[corporation_id]` on the table `corporation_addresses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[corporation_id]` on the table `corporation_executive_sponsors` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "corporation_addresses_corporation_id_key" ON "corporation_addresses"("corporation_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporation_executive_sponsors_corporation_id_key" ON "corporation_executive_sponsors"("corporation_id");
