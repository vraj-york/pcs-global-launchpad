-- CreateTable
CREATE TABLE "corporation_companies" (
    "id" TEXT NOT NULL,
    "corporation_id" TEXT NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "company_type" VARCHAR(255) NOT NULL,
    "office_type" VARCHAR(255) NOT NULL,
    "state" VARCHAR(255) NOT NULL,
    "city" VARCHAR(255) NOT NULL,
    "zip" VARCHAR(255) NOT NULL,
    "admin_name" VARCHAR(255) NOT NULL,
    "admin_email" VARCHAR(255) NOT NULL,
    "no_of_employees" INTEGER NOT NULL,
    "security_posture" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporation_companies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "corporation_companies" ADD CONSTRAINT "corporation_companies_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
