-- CreateTable
CREATE TABLE "company_configuration" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "auth_method" VARCHAR(255) NOT NULL DEFAULT 'Email & Password',
    "password_policy" VARCHAR(255) NOT NULL DEFAULT 'Standard (8+ Characters & Mixed case)',
    "MFA" VARCHAR(255) NOT NULL DEFAULT 'Required',
    "session_timeout" VARCHAR(255) NOT NULL DEFAULT '60 min',
    "security_posture" VARCHAR(255) NOT NULL DEFAULT 'Standard',
    "primary_language" VARCHAR(255) NOT NULL DEFAULT 'English (US)',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_configuration_company_id_key" ON "company_configuration"("company_id");

-- AddForeignKey
ALTER TABLE "company_configuration" ADD CONSTRAINT "company_configuration_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
