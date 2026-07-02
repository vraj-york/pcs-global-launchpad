-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "cell_phone" VARCHAR(255),
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "corporation_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "invitation_sent_at" TIMESTAMP(3),
ADD COLUMN     "invite_type" VARCHAR(255),
ADD COLUMN     "nickname" VARCHAR(255),
ADD COLUMN     "role_id" TEXT,
ADD COLUMN     "status" VARCHAR(255) NOT NULL DEFAULT 'Pending',
ADD COLUMN     "timezone" VARCHAR(255),
ADD COLUMN     "work_phone" VARCHAR(255);

-- CreateIndex
CREATE INDEX "app_users_corporation_id_idx" ON "app_users"("corporation_id");

-- CreateIndex
CREATE INDEX "app_users_company_id_idx" ON "app_users"("company_id");

-- CreateIndex
CREATE INDEX "app_users_role_id_idx" ON "app_users"("role_id");

-- CreateIndex
CREATE INDEX "app_users_category_id_idx" ON "app_users"("category_id");

-- CreateIndex
CREATE INDEX "app_users_deleted_at_idx" ON "app_users"("deleted_at");

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "role_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
