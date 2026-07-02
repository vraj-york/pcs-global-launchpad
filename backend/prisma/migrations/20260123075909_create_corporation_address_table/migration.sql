-- CreateTable
CREATE TABLE "corporation_addresses" (
    "id" TEXT NOT NULL,
    "corporation_id" TEXT NOT NULL,
    "address_line" VARCHAR(255) NOT NULL,
    "state" VARCHAR(255) NOT NULL,
    "city" VARCHAR(255) NOT NULL,
    "country" VARCHAR(255) NOT NULL,
    "zip" VARCHAR(255),
    "timezone" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporation_addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "corporation_addresses" ADD CONSTRAINT "corporation_addresses_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
