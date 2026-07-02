-- CreateTable
CREATE TABLE "corporation_key_contacts" (
    "id" TEXT NOT NULL,
    "corporation_id" TEXT NOT NULL,
    "contact_type" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "work_phone" VARCHAR(255) NOT NULL,
    "cell_phone" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporation_key_contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "corporation_key_contacts" ADD CONSTRAINT "corporation_key_contacts_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
