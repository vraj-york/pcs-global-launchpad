-- CreateTable
CREATE TABLE "corporation_executive_sponsors" (
    "id" TEXT NOT NULL,
    "corporation_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "work_phone" VARCHAR(255) NOT NULL,
    "cell_phone" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporation_executive_sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corporation_executive_sponsors_name_idx" ON "corporation_executive_sponsors"("name");

-- CreateIndex
CREATE INDEX "corporation_executive_sponsors_email_idx" ON "corporation_executive_sponsors"("email");

-- AddForeignKey
ALTER TABLE "corporation_executive_sponsors" ADD CONSTRAINT "corporation_executive_sponsors_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
