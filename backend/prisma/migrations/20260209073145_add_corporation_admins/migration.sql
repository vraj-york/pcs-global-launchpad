-- CreateTable
CREATE TABLE "corporation_admins" (
    "id" TEXT NOT NULL,
    "corporation_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "work_phone" VARCHAR(255) NOT NULL,
    "cell_phone" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporation_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corporation_admins_corporation_id_key" ON "corporation_admins"("corporation_id");

-- AddForeignKey
ALTER TABLE "corporation_admins" ADD CONSTRAINT "corporation_admins_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
