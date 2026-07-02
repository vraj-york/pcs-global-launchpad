-- Company admin invite tracking (email sent timestamp; no DB invite tokens)
ALTER TABLE "corporation_companies" ADD COLUMN "company_admin_invite_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "cognito_user_groups" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" VARCHAR(64) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cognito_user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_users" (
    "cognito_sub" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255),
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("cognito_sub")
);

-- CreateTable
CREATE TABLE "app_user_group_memberships" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "group_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_access" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_company_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cognito_user_groups_name_key" ON "cognito_user_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE INDEX "app_users_email_idx" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_group_memberships_user_id_group_id_key" ON "app_user_group_memberships"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "app_user_group_memberships_group_id_idx" ON "app_user_group_memberships"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_access_user_id_company_id_key" ON "user_company_access"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "user_company_access_company_id_idx" ON "user_company_access"("company_id");

-- AddForeignKey
ALTER TABLE "app_user_group_memberships" ADD CONSTRAINT "app_user_group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user_group_memberships" ADD CONSTRAINT "app_user_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "cognito_user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed Cognito pool group catalog (names must match Cognito User Pool groups exactly)
INSERT INTO "cognito_user_groups" ("name", "description", "created_at", "updated_at")
VALUES
  ('SuperAdmin', 'Cognito SuperAdmin pool group', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('CompanyAdmin', 'Cognito CompanyAdmin pool group', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
