-- CreateTable
CREATE TABLE "company_plan_seats" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "zero_trial" BOOLEAN NOT NULL DEFAULT true,
    "trial_length_duration" INTEGER NOT NULL DEFAULT 14,
    "trial_length_type" VARCHAR(50) NOT NULL DEFAULT 'days',
    "trial_start_date" DATE,
    "trial_end_date" DATE,
    "plan_price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "invoice_amount" DECIMAL(10,2) NOT NULL,
    "billing_currency" VARCHAR(50) NOT NULL DEFAULT 'USD ($)',
    "auto_convert_trial" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_plan_seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_plan_seats_company_id_key" ON "company_plan_seats"("company_id");

-- AddForeignKey
ALTER TABLE "company_plan_seats" ADD CONSTRAINT "company_plan_seats_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
