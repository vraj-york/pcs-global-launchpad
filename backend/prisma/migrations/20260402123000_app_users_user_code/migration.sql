-- AlterTable
ALTER TABLE "app_users" ADD COLUMN "user_code" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "app_users_user_code_key" ON "app_users"("user_code");
