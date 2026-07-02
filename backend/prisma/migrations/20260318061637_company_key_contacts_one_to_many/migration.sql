-- AlterTable
ALTER TABLE "corporation_companies" ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "company_key_contacts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "contact_type" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "nickname" VARCHAR(255),
    "role" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "work_phone" VARCHAR(255) NOT NULL,
    "cell_phone" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_key_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_key_contacts_company_id_idx" ON "company_key_contacts"("company_id");

-- AddForeignKey
ALTER TABLE "company_key_contacts" ADD CONSTRAINT "company_key_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
