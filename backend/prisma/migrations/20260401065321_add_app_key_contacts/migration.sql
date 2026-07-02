-- CreateTable
CREATE TABLE "app_key_contacts" (
    "id" TEXT NOT NULL,
    "contact_code" SERIAL NOT NULL,
    "corporation_id" TEXT,
    "company_id" TEXT,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "nickname" VARCHAR(255),
    "email" VARCHAR(255),
    "contact_type" VARCHAR(255),
    "status" VARCHAR(255) NOT NULL DEFAULT 'Not Invited',
    "job_role" VARCHAR(255),
    "work_phone" VARCHAR(255),
    "cell_phone" VARCHAR(255),
    "timezone" VARCHAR(255),
    "same_as_corp_admin" BOOLEAN NOT NULL DEFAULT false,
    "app_user_id" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "app_key_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_key_contacts_contact_code_key" ON "app_key_contacts"("contact_code");

-- CreateIndex
CREATE UNIQUE INDEX "app_key_contacts_app_user_id_key" ON "app_key_contacts"("app_user_id");

-- CreateIndex
CREATE INDEX "app_key_contacts_corporation_id_idx" ON "app_key_contacts"("corporation_id");

-- CreateIndex
CREATE INDEX "app_key_contacts_company_id_idx" ON "app_key_contacts"("company_id");

-- AddForeignKey
ALTER TABLE "app_key_contacts" ADD CONSTRAINT "app_key_contacts_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_key_contacts" ADD CONSTRAINT "app_key_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_key_contacts" ADD CONSTRAINT "app_key_contacts_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("cognito_sub") ON DELETE SET NULL ON UPDATE CASCADE;
